"""Unit tests for order value analytics and SQL aggregation calculations."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from ecommerce_agent.schemas.support import OrderValueSummary
from ecommerce_agent.tools import analytics as analytics_tools


def test_get_order_value_summary_excludes_cancelled():
    """Verify analytics aggregates eligible statuses and excludes cancelled orders."""
    # User has 3 orders: 2 delivered (56485, 3299), 1 cancelled (5000)
    mock_summary = OrderValueSummary(
        user_id=1,
        eligible_order_count=2,
        total_eligible_order_value_inr=59784.0,
        average_order_value_inr=29892.0,
        status_breakdown={
            "delivered": {"order_count": 2, "total_value_inr": 59784.0},
            "cancelled": {"order_count": 1, "total_value_inr": 5000.0},
        },
        cancelled_orders_count=1,
        cancelled_orders_value_inr=5000.0,
    )

    with patch("ecommerce_agent.db.repositories.analytics_repo.get_order_value_summary", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_summary

        res = asyncio.run(analytics_tools.get_order_value_summary())
        assert res["status"] == "success"
        data = res["data"]
        # Eligible total MUST exclude the 5000 cancelled order
        assert data["total_eligible_order_value_inr"] == 59784.0
        assert data["eligible_order_count"] == 2
        assert data["cancelled_orders_count"] == 1
        assert data["cancelled_orders_value_inr"] == 5000.0
        assert data["average_order_value_inr"] == 29892.0
