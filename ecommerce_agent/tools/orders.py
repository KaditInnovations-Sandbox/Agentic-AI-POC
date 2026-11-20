"""ADK Orders, Proposals, and Cancellation Tools for Shopity."""

from typing import Any
from ecommerce_agent.db.connection import get_db_session
from ecommerce_agent.db.repositories import orders_repo
from ecommerce_agent.services.auth import get_current_user_id


async def get_order_history(limit: int = 10, status: str | None = None) -> dict:
    """Retrieves the customer's previous orders, statuses, and placement dates.

    Args:
        limit: Maximum number of orders to return (default 10).
        status: Optional status filter ('placed', 'packed', 'shipped', 'delivered', 'cancelled').

    Returns:
        dict: List of customer orders with totals and item counts.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            orders = await orders_repo.get_order_history(
                session, user_id=user_id, limit=limit, status=status
            )
            return {"status": "success", "data": [o.model_dump() for o in orders]}
    except Exception as e:
        return {"status": "error", "message": f"Failed to retrieve order history: {str(e)}"}


async def get_order_details(order_id: int) -> dict:
    """Retrieves full details, line items, and delivery address for a specific customer-owned order.

    Args:
        order_id: The ID of the order to inspect.

    Returns:
        dict: Order details, line items, quantities, and current order status.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            order = await orders_repo.get_order_details(
                session, user_id=user_id, order_id=order_id
            )
            if not order:
                return {
                    "status": "error",
                    "message": f"Order ID {order_id} was not found or does not belong to your account.",
                }
            return {"status": "success", "data": order.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Failed to retrieve order details: {str(e)}"}


async def create_order_proposal(
    product_id: int,
    quantity: int = 1,
    tool_context: Any = None,
) -> dict:
    """Creates a purchase proposal snapshot with locked quoted price and verified inventory.

    IMPORTANT SAFETY BOUNDARY:
    - This tool creates an IMMUTABLE PRICE SNAPSHOT for customer review.
    - It does NOT place an actual order.
    - It does NOT freeze catalog prices for other customers.
    - It does NOT reserve inventory.
    - Actual order placement requires customer approval via the Approve & Place Order button.

    Args:
        product_id: The ID of the product to propose for purchase.
        quantity: Desired purchase quantity (default 1).

    Returns:
        dict: Proposal ID, quoted unit price, estimated total, expiry, and non-execution notice.
    """
    try:
        user_id = get_current_user_id()
        # Extract active ADK session ID from tool_context if available
        adk_session_id = "adk-session-web"
        if tool_context and hasattr(tool_context, "session") and tool_context.session:
            adk_session_id = getattr(tool_context.session, "id", "adk-session-web")

        async with get_db_session() as session:
            result = await orders_repo.create_order_proposal(
                session=session,
                user_id=user_id,
                product_id=product_id,
                quantity=quantity,
                adk_session_id=adk_session_id,
            )
            if isinstance(result, dict) and "error" in result:
                return {"status": "error", "message": result["error"]}
            return {"status": "success", "data": result.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Failed to create order proposal: {str(e)}"}


async def get_order_proposal(proposal_id: int) -> dict:
    """Retrieves the status, quoted price, and details of an existing purchase proposal.

    Args:
        proposal_id: The unique proposal identifier.

    Returns:
        dict: Proposal details, quoted price, expiry, and review status.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            proposal = await orders_repo.get_order_proposal(
                session, user_id=user_id, proposal_id=proposal_id
            )
            if not proposal:
                return {
                    "status": "error",
                    "message": f"Proposal ID {proposal_id} was not found or does not belong to your account.",
                }
            return {"status": "success", "data": proposal.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Failed to retrieve order proposal: {str(e)}"}


async def update_order_proposal(proposal_id: int, quantity: int) -> dict:
    """Updates the quantity of an existing pending order proposal.

    Use this tool whenever the customer asks to modify, increase, decrease, or change
    the quantity on a previously created quote proposal (e.g. 'change it to 2', 'make it 3 units')
    instead of creating a duplicate new proposal.

    Args:
        proposal_id: The ID of the existing pending proposal.
        quantity: The new purchase quantity (must be >= 1).

    Returns:
        dict: Updated proposal details, recalculated total, and new 15-minute price lock.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            result = await orders_repo.update_order_proposal(
                session=session, user_id=user_id, proposal_id=proposal_id, quantity=quantity
            )
            if isinstance(result, dict) and "error" in result:
                return {"status": "error", "message": result["error"]}
            return {"status": "success", "data": result.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Failed to update order proposal: {str(e)}"}


async def cancel_order_proposal(proposal_id: int) -> dict:
    """Cancels/discards an existing pending purchase proposal.

    Use this tool whenever the customer says they want to cancel, discard, or reject
    a previously presented quote proposal (e.g. 'cancel the quote', 'nevermind', 'discard it').

    Args:
        proposal_id: The ID of the proposal to cancel.

    Returns:
        dict: Confirmation of cancellation.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            return await orders_repo.cancel_order_proposal(
                session=session, user_id=user_id, proposal_id=proposal_id
            )
    except Exception as e:
        return {"status": "error", "message": f"Failed to cancel order proposal: {str(e)}"}


async def check_order_cancellation_eligibility(order_id: int) -> dict:
    """Checks whether an owned order is eligible for cancellation according to store policy.

    POLICY:
    - Only 'placed' orders may be cancelled before warehouse processing begins.
    - 'packed', 'shipped', 'delivered', and already 'cancelled' orders cannot be cancelled.

    Args:
        order_id: The ID of the order to check.

    Returns:
        dict: Eligibility status, current order state, and policy explanation.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            result = await orders_repo.check_order_cancellation_eligibility(
                session, user_id=user_id, order_id=order_id
            )
            if isinstance(result, dict) and "error" in result:
                return {"status": "error", "message": result["error"]}
            return {"status": "success", "data": result.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Failed to check cancellation eligibility: {str(e)}"}
