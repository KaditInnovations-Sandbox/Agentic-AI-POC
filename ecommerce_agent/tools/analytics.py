"""ADK Analytics Tools for Shopity."""

from ecommerce_agent.db.connection import get_db_session
from ecommerce_agent.db.repositories import analytics_repo
from ecommerce_agent.services.auth import get_current_user_id


async def get_order_value_summary() -> dict:
    """Calculates customer order value summary and status breakdown using SQL aggregation.

    TERMINOLOGY & INTEGRITY:
    - Calculates total gross value from recorded orders, NOT verified payment transactions.
    - Aggregates eligible orders (placed, packed, shipped, delivered).
    - Strictly excludes cancelled orders from eligible order value totals.

    Returns:
        dict: Total eligible order value in INR, order counts, average order value, and breakdown by status.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            summary = await analytics_repo.get_order_value_summary(
                session, user_id=user_id
            )
            return {"status": "success", "data": summary.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Failed to calculate order value summary: {str(e)}"}


# Alias for backward-compatible intent matching
get_spending_summary = get_order_value_summary
