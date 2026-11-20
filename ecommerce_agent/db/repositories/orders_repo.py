"""Orders and proposals repository: order history, line item inspection, proposals, and cancellation eligibility."""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ecommerce_agent.db.models import Inventory, Order, OrderItem, OrderProposal, Product
from ecommerce_agent.schemas.orders import (
    OrderCancellationEligibility,
    OrderDetail,
    OrderItemDetail,
    OrderProposalResponse,
    OrderSummary,
)


async def get_order_history(
    session: AsyncSession,
    user_id: int,
    limit: int = 10,
    status: str | None = None,
) -> list[OrderSummary]:
    """Retrieves customer's orders sorted by placement date."""
    stmt = (
        select(Order)
        .where(Order.user_id == user_id)
        .options(selectinload(Order.items))
        .order_by(desc(Order.placed_at))
    )
    if status and status.strip():
        stmt = stmt.where(Order.status == status.strip().lower())

    stmt = stmt.limit(limit)
    res = await session.execute(stmt)
    orders = res.scalars().all()

    return [
        OrderSummary(
            id=o.id,
            order_number=o.order_number,
            status=o.status,
            total_inr=float(o.total_inr),
            placed_at=o.placed_at.strftime("%Y-%m-%d %H:%M UTC"),
            item_count=sum(item.quantity for item in o.items),
        )
        for o in orders
    ]


async def get_order_details(
    session: AsyncSession,
    user_id: int,
    order_id: int,
) -> OrderDetail | None:
    """Retrieves full details for an owned order.

    SECURITY: Strictly enforces customer ownership (user_id == current_user_id).
    Returns None if order does not exist or belongs to another user.
    """
    stmt = (
        select(Order)
        .where(Order.id == order_id, Order.user_id == user_id)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
    )
    res = await session.execute(stmt)
    order = res.scalars().first()
    if not order:
        return None

    items: list[OrderItemDetail] = []
    for oi in order.items:
        prod = oi.product
        unit_price = oi.unit_price_inr
        line_total = Decimal(oi.quantity) * unit_price
        items.append(
            OrderItemDetail(
                product_id=oi.product_id,
                sku=prod.sku if prod else "UNKNOWN",
                name=prod.name if prod else "Product unavailable",
                brand=prod.brand if prod else "",
                quantity=oi.quantity,
                unit_price_inr=float(unit_price),
                line_total_inr=float(line_total),
            )
        )

    return OrderDetail(
        id=order.id,
        order_number=order.order_number,
        user_id=order.user_id,
        status=order.status,
        total_inr=float(order.total_inr),
        shipping_address=order.shipping_address or {},
        placed_at=order.placed_at.strftime("%Y-%m-%d %H:%M UTC"),
        items=items,
    )


async def create_order_proposal(
    session: AsyncSession,
    user_id: int,
    product_id: int,
    quantity: int,
    adk_session_id: str = "adk-session-default",
) -> OrderProposalResponse | dict[str, str]:
    """Creates a pending, immutable purchase proposal.

    BOUNDARY:
    - Stores an immutable price snapshot at current catalog price.
    - Does NOT lock the catalog price.
    - Does NOT reserve inventory.
    - Does NOT insert records into orders.
    """
    if quantity <= 0:
        return {"error": "Quantity must be greater than zero."}

    # 1. Verify product and inventory availability
    stmt = (
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.inventory))
    )
    res = await session.execute(stmt)
    product = res.scalars().first()

    if not product or not product.active:
        return {"error": f"Product ID {product_id} is inactive or does not exist."}

    avail_qty = product.inventory.available_qty if product.inventory else 0
    if quantity > avail_qty:
        return {
            "error": f"Cannot create proposal for {quantity} units. Only {avail_qty} currently available in stock."
        }

    # 2. Immutable price snapshot and proposal creation
    quoted_price = product.price_inr
    idempotency_key = f"prop-{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    proposal = OrderProposal(
        user_id=user_id,
        adk_session_id=adk_session_id,
        product_id=product_id,
        quantity=quantity,
        quoted_unit_price_inr=quoted_price,
        status="pending",
        idempotency_key=idempotency_key,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
    )
    session.add(proposal)
    await session.commit()
    await session.refresh(proposal)

    total_est = float(quoted_price * Decimal(quantity))

    return OrderProposalResponse(
        id=proposal.id,
        user_id=proposal.user_id,
        product_id=proposal.product_id,
        product_name=product.name,
        quantity=proposal.quantity,
        quoted_unit_price_inr=float(proposal.quoted_unit_price_inr),
        total_estimated_inr=total_est,
        status=proposal.status,
        idempotency_key=proposal.idempotency_key,
        expires_at=proposal.expires_at.isoformat(),
        created_at=proposal.created_at.isoformat(),
    )


async def get_order_proposal(
    session: AsyncSession,
    user_id: int,
    proposal_id: int,
) -> OrderProposalResponse | None:
    """Retrieves an owned proposal by ID."""
    stmt = (
        select(OrderProposal)
        .where(OrderProposal.id == proposal_id, OrderProposal.user_id == user_id)
        .options(selectinload(OrderProposal.product))
    )
    res = await session.execute(stmt)
    prop = res.scalars().first()
    if not prop:
        return None

    prod_name = prop.product.name if prop.product else "Unknown Product"
    total_est = float(prop.quoted_unit_price_inr * Decimal(prop.quantity))

    return OrderProposalResponse(
        id=prop.id,
        user_id=prop.user_id,
        product_id=prop.product_id,
        product_name=prod_name,
        quantity=prop.quantity,
        quoted_unit_price_inr=float(prop.quoted_unit_price_inr),
        total_estimated_inr=total_est,
        status=prop.status,
        idempotency_key=prop.idempotency_key,
        expires_at=prop.expires_at.isoformat(),
        created_at=prop.created_at.isoformat(),
    )


async def update_order_proposal(
    session: AsyncSession,
    user_id: int,
    proposal_id: int,
    quantity: int,
) -> OrderProposalResponse | dict[str, str]:
    """Updates the requested quantity on an existing pending order proposal."""
    if quantity <= 0:
        return {"error": "Quantity must be greater than zero."}

    stmt = (
        select(OrderProposal)
        .where(OrderProposal.id == proposal_id, OrderProposal.user_id == user_id)
        .options(selectinload(OrderProposal.product).selectinload(Product.inventory))
    )
    res = await session.execute(stmt)
    prop = res.scalars().first()
    if not prop:
        return {"error": f"Proposal #{proposal_id} not found or does not belong to you."}

    if prop.status != "pending":
        return {"error": f"Proposal #{proposal_id} is '{prop.status}' and cannot be modified."}

    product = prop.product
    avail_qty = product.inventory.available_qty if (product and product.inventory) else 0
    if quantity > avail_qty:
        return {"error": f"Cannot update to {quantity} units. Only {avail_qty} currently available in stock."}

    prop.quantity = quantity
    prop.expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    await session.commit()
    await session.refresh(prop)

    prod_name = product.name if product else "Unknown Product"
    total_est = float(prop.quoted_unit_price_inr * Decimal(prop.quantity))

    return OrderProposalResponse(
        id=prop.id,
        user_id=prop.user_id,
        product_id=prop.product_id,
        product_name=prod_name,
        quantity=prop.quantity,
        quoted_unit_price_inr=float(prop.quoted_unit_price_inr),
        total_estimated_inr=total_est,
        status=prop.status,
        idempotency_key=prop.idempotency_key,
        expires_at=prop.expires_at.isoformat(),
        created_at=prop.created_at.isoformat(),
    )


async def cancel_order_proposal(
    session: AsyncSession,
    user_id: int,
    proposal_id: int,
) -> dict[str, Any]:
    """Cancels an existing pending order proposal."""
    stmt = (
        select(OrderProposal)
        .where(OrderProposal.id == proposal_id, OrderProposal.user_id == user_id)
    )
    res = await session.execute(stmt)
    prop = res.scalars().first()
    if not prop:
        return {"status": "error", "message": f"Proposal #{proposal_id} not found or does not belong to you."}

    if prop.status != "pending":
        return {"status": "error", "message": f"Proposal #{proposal_id} is already '{prop.status}'."}

    prop.status = "cancelled"
    await session.commit()
    return {
        "status": "success",
        "message": f"Order proposal #{proposal_id} has been cancelled.",
        "proposal_id": proposal_id,
    }


async def check_order_cancellation_eligibility(
    session: AsyncSession,
    user_id: int,
    order_id: int,
) -> OrderCancellationEligibility | dict[str, str]:
    """Inspects order cancellation eligibility per store policy.

    POLICY:
    - Only 'placed' orders may be cancelled.
    - 'packed', 'shipped', 'delivered', and 'cancelled' orders cannot be cancelled.
    """
    stmt = select(Order).where(Order.id == order_id, Order.user_id == user_id)
    res = await session.execute(stmt)
    order = res.scalars().first()

    if not order:
        return {"error": f"Order ID {order_id} not found or does not belong to your account."}

    policy_explanation = (
        "Store Policy: Orders may only be cancelled while in 'placed' status before warehouse processing. "
        "Orders in 'packed', 'shipped', or 'delivered' status cannot be cancelled."
    )

    if order.status == "placed":
        return OrderCancellationEligibility(
            order_id=order.id,
            order_number=order.order_number,
            current_status=order.status,
            is_eligible_for_cancellation=True,
            reason="Order is in 'placed' status and has not yet been packed by the fulfillment team.",
            policy_explanation=policy_explanation,
        )
    elif order.status == "cancelled":
        return OrderCancellationEligibility(
            order_id=order.id,
            order_number=order.order_number,
            current_status=order.status,
            is_eligible_for_cancellation=False,
            reason="This order is already cancelled.",
            policy_explanation=policy_explanation,
        )
    else:
        return OrderCancellationEligibility(
            order_id=order.id,
            order_number=order.order_number,
            current_status=order.status,
            is_eligible_for_cancellation=False,
            reason=f"Order is currently '{order.status}'. Once an order is packed or shipped, cancellation is not permitted.",
            policy_explanation=policy_explanation,
        )
