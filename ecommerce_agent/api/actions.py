"""Direct Action API endpoints for frontend interaction.

These endpoints handle authenticated user approvals triggered from UI buttons
(e.g., 'Approve Purchase Proposal', 'Submit Support Ticket', 'Cancel Placed Order').
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from ecommerce_agent.db.connection import get_db_session
from ecommerce_agent.db.models import Inventory, Order, OrderItem, OrderProposal, Product, SupportTicket
from ecommerce_agent.services.auth import get_current_user_id
from ecommerce_agent.services.ticket_drafts import get_ticket_draft

router = APIRouter(prefix="/api", tags=["Frontend Action Endpoints"])


class ApproveProposalRequest(BaseModel):
    shipping_address: dict[str, Any] | None = None


class SubmitDraftRequest(BaseModel):
    draft_id: str


@router.post("/proposals/{proposal_id}/approve")
async def approve_order_proposal(
    proposal_id: int,
    payload: ApproveProposalRequest | None = None,
):
    """Executes a purchase proposal after explicit customer approval in the UI.

    REVALIDATION PROTOCOL:
    1. Verifies proposal ownership and status == 'pending'.
    2. Verifies proposal has not expired.
    3. Revalidates current catalog price matches the quoted price snapshot.
    4. Revalidates real-time available stock >= requested quantity.
    5. Atomically creates order, records order item, updates proposal status, and decrements stock.
    """
    user_id = get_current_user_id()
    shipping_addr = (payload and payload.shipping_address) or {
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
    }

    async with get_db_session() as session:
        # 1. Fetch proposal
        stmt = (
            select(OrderProposal)
            .where(OrderProposal.id == proposal_id, OrderProposal.user_id == user_id)
            .options(selectinload(OrderProposal.product).selectinload(Product.inventory))
        )
        res = await session.execute(stmt)
        proposal = res.scalars().first()

        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proposal ID {proposal_id} not found or not owned by user.",
            )

        if proposal.status != "pending":
            if proposal.status == "executed":
                # Idempotent return: find existing order created for this proposal item
                order_stmt = (
                    select(Order)
                    .join(OrderItem, Order.id == OrderItem.order_id)
                    .where(Order.user_id == user_id, OrderItem.product_id == proposal.product_id)
                    .order_by(Order.id.desc())
                )
                existing_res = await session.execute(order_stmt)
                existing_order = existing_res.scalars().first()
                return {
                    "status": "success",
                    "message": "This order has already been placed successfully.",
                    "order": {
                        "id": existing_order.id if existing_order else None,
                        "order_number": existing_order.order_number if existing_order else f"ORD-PROP{proposal.id}",
                        "status": "placed",
                        "total_inr": float(proposal.quoted_unit_price_inr * Decimal(proposal.quantity)),
                        "placed_at": (
                            existing_order.placed_at.isoformat()
                            if existing_order and existing_order.placed_at
                            else datetime.now(timezone.utc).isoformat()
                        ),
                        "product_name": proposal.product.name if proposal.product else "Product",
                        "quantity": proposal.quantity,
                    },
                }
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This checkout request is {proposal.status} and cannot be processed.",
            )

        # 2. Check expiration
        now_utc = datetime.now(timezone.utc)
        if proposal.expires_at <= now_utc:
            proposal.status = "expired"
            await session.commit()
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Proposal has expired. Please create a new purchase proposal with the shopping advisor.",
            )

        # 3. Revalidate live catalog price
        product = proposal.product
        if not product or not product.active:
            proposal.status = "failed"
            await session.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product is no longer active in the catalog.",
            )

        if product.price_inr != proposal.quoted_unit_price_inr:
            proposal.status = "failed"
            await session.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Catalog price changed from ₹{proposal.quoted_unit_price_inr} to ₹{product.price_inr}. "
                    "Renewed proposal required."
                ),
            )

        # 4. Revalidate real-time available stock
        inventory = product.inventory
        available_stock = inventory.available_qty if inventory else 0
        if available_stock < proposal.quantity:
            proposal.status = "failed"
            await session.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Insufficient inventory. Only {available_stock} units currently available.",
            )

        # 5. Atomic execution: create order, decrement inventory, update proposal status
        order_number = f"ORD-{uuid.uuid4().hex[:6].upper()}"
        total_inr = proposal.quoted_unit_price_inr * Decimal(proposal.quantity)

        new_order = Order(
            order_number=order_number,
            user_id=user_id,
            status="placed",
            total_inr=total_inr,
            shipping_address=shipping_addr,
            placed_at=now_utc,
        )
        session.add(new_order)
        await session.flush()

        new_order_item = OrderItem(
            order_id=new_order.id,
            product_id=proposal.product_id,
            quantity=proposal.quantity,
            unit_price_inr=proposal.quoted_unit_price_inr,
        )
        session.add(new_order_item)

        # Decrement inventory stock
        inventory.stock_qty -= proposal.quantity
        proposal.status = "executed"

        await session.commit()

        return {
            "status": "success",
            "message": "Order successfully placed!",
            "order": {
                "id": new_order.id,
                "order_number": new_order.order_number,
                "status": new_order.status,
                "total_inr": float(new_order.total_inr),
                "placed_at": new_order.placed_at.isoformat(),
                "product_name": product.name,
                "quantity": proposal.quantity,
            },
        }


@router.get("/proposals/{proposal_id}")
async def get_proposal_status(proposal_id: int):
    """Retrieves proposal details and status for frontend UI state reconciliation."""
    user_id = get_current_user_id()
    async with get_db_session() as session:
        stmt = (
            select(OrderProposal)
            .where(OrderProposal.id == proposal_id, OrderProposal.user_id == user_id)
            .options(selectinload(OrderProposal.product))
        )
        res = await session.execute(stmt)
        proposal = res.scalars().first()
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found.")
        return {
            "id": proposal.id,
            "status": proposal.status,
            "product_id": proposal.product_id,
            "product_name": proposal.product.name if proposal.product else "",
            "quantity": proposal.quantity,
            "quoted_unit_price_inr": float(proposal.quoted_unit_price_inr),
            "total_estimated_inr": float(proposal.quoted_unit_price_inr * Decimal(proposal.quantity)),
            "expires_at": proposal.expires_at.isoformat() if proposal.expires_at else None,
        }


@router.post("/tickets/drafts/{draft_id}/submit")
async def submit_support_ticket(draft_id: str):
    """Submits an unsubmitted ticket draft into the PostgreSQL support_tickets table."""
    user_id = get_current_user_id()
    draft = get_ticket_draft(draft_id, user_id=user_id)

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket draft '{draft_id}' not found or belongs to another user.",
        )

    async with get_db_session() as session:
        ticket_number = f"TKT-{uuid.uuid4().hex[:6].upper()}"
        ticket = SupportTicket(
            ticket_number=ticket_number,
            user_id=user_id,
            order_id=draft.get("order_id"),
            subject=draft["subject"],
            description=draft["description"],
            status="open",
            created_at=datetime.now(timezone.utc),
        )
        session.add(ticket)
        await session.commit()
        await session.refresh(ticket)

        return {
            "status": "success",
            "message": "Support ticket submitted successfully.",
            "ticket": {
                "id": ticket.id,
                "ticket_number": ticket.ticket_number,
                "status": ticket.status,
                "subject": ticket.subject,
                "created_at": ticket.created_at.isoformat(),
            },
        }


@router.post("/orders/{order_id}/cancel")
async def execute_order_cancellation(order_id: int):
    """Cancels an eligible 'placed' order."""
    user_id = get_current_user_id()

    async with get_db_session() as session:
        # Atomic transition: only 'placed' orders may be cancelled
        stmt = (
            update(Order)
            .where(Order.id == order_id, Order.user_id == user_id, Order.status == "placed")
            .values(status="cancelled")
        )
        result = await session.execute(stmt)

        if result.rowcount == 0:
            # Check why it failed
            check_stmt = select(Order).where(Order.id == order_id, Order.user_id == user_id)
            res = await session.execute(check_stmt)
            order = res.scalars().first()
            if not order:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Order ID {order_id} was not found.",
                )
            if order.status == "cancelled":
                return {"status": "success", "message": "Order is already cancelled."}
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order is currently '{order.status}'. Only 'placed' orders may be cancelled.",
            )

        # Restore inventory
        items_stmt = select(OrderItem).where(OrderItem.order_id == order_id)
        items_res = await session.execute(items_stmt)
        for item in items_res.scalars().all():
            inv_stmt = (
                update(Inventory)
                .where(Inventory.product_id == item.product_id)
                .values(stock_qty=Inventory.stock_qty + item.quantity)
            )
            await session.execute(inv_stmt)

        await session.commit()
        return {
            "status": "success",
            "message": f"Order {order_id} has been cancelled and inventory restored.",
        }
