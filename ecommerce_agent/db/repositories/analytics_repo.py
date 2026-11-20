"""Analytics repository: SQL aggregation of customer order values."""

from decimal import Decimal
from typing import Any
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ecommerce_agent.db.models import Order
from ecommerce_agent.schemas.support import OrderValueSummary

ELIGIBLE_SPENDING_STATUSES = {"placed", "packed", "shipped", "delivered"}


async def get_order_value_summary(
    session: AsyncSession,
    user_id: int,
) -> OrderValueSummary:
    """Calculates gross order value using SQL aggregation.

    TERMINOLOGY & INTEGRITY:
    - Represents gross order value, not verified payment transactions.
    - Aggregates eligible statuses: placed, packed, shipped, delivered.
    - Excludes cancelled orders from eligible totals.
    """
    stmt = (
        select(
            Order.status,
            func.count(Order.id).label("status_count"),
            func.coalesce(func.sum(Order.total_inr), Decimal("0.00")).label("status_total"),
        )
        .where(Order.user_id == user_id)
        .group_by(Order.status)
    )
    res = await session.execute(stmt)
    rows = res.all()

    status_breakdown: dict[str, dict[str, Any]] = {}
    eligible_count = 0
    eligible_total = Decimal("0.00")
    cancelled_count = 0
    cancelled_total = Decimal("0.00")

    for status_val, count_val, total_val in rows:
        st_count = int(count_val)
        st_total = float(total_val)
        status_breakdown[status_val] = {
            "order_count": st_count,
            "total_value_inr": st_total,
        }

        if status_val in ELIGIBLE_SPENDING_STATUSES:
            eligible_count += st_count
            eligible_total += Decimal(str(total_val))
        elif status_val == "cancelled":
            cancelled_count += st_count
            cancelled_total += Decimal(str(total_val))

    avg_order_value = float(eligible_total / eligible_count) if eligible_count > 0 else 0.0

    return OrderValueSummary(
        user_id=user_id,
        eligible_order_count=eligible_count,
        total_eligible_order_value_inr=float(eligible_total),
        average_order_value_inr=round(avg_order_value, 2),
        status_breakdown=status_breakdown,
        cancelled_orders_count=cancelled_count,
        cancelled_orders_value_inr=float(cancelled_total),
    )
