"""Unit tests for orders, immutable proposals, and cancellation eligibility."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from ecommerce_agent.schemas.orders import (
    OrderCancellationEligibility,
    OrderDetail,
    OrderItemDetail,
    OrderProposalResponse,
    OrderSummary,
)
from ecommerce_agent.tools import orders as order_tools


def test_get_order_history():
    """Test retrieving user's order history."""
    mock_orders = [
        OrderSummary(id=1, order_number="ORD-1001", status="delivered", total_inr=56485.0, placed_at="2026-10-01", item_count=2),
        OrderSummary(id=2, order_number="ORD-1002", status="delivered", total_inr=3299.0, placed_at="2026-10-20", item_count=1),
    ]

    with patch("ecommerce_agent.db.repositories.orders_repo.get_order_history", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_orders

        res = asyncio.run(order_tools.get_order_history())
        assert res["status"] == "success"
        assert len(res["data"]) == 2
        assert res["data"][0]["order_number"] == "ORD-1001"


def test_get_order_details_ownership_enforcement():
    """Verify that unauthorized access to another user's order returns not found."""
    with patch("ecommerce_agent.db.repositories.orders_repo.get_order_details", new_callable=AsyncMock) as mock_repo:
        # User 1 tries to access order 4 (which belongs to user 2) -> repo returns None
        mock_repo.return_value = None

        res = asyncio.run(order_tools.get_order_details(order_id=4))
        assert res["status"] == "error"
        assert "not found or does not belong" in res["message"]


def test_create_order_proposal_boundary():
    """Verify proposal creates an immutable price snapshot without placing an order."""
    mock_proposal = OrderProposalResponse(
        id=50,
        user_id=1,
        product_id=102,
        product_name="Lenovo IdeaPad Slim 3 Demo",
        quantity=1,
        quoted_unit_price_inr=49990.0,
        total_estimated_inr=49990.0,
        status="pending",
        idempotency_key="prop-abc-123",
        expires_at="2026-11-19 12:00 UTC",
        created_at="2026-11-18 12:00 UTC",
    )

    with patch("ecommerce_agent.db.repositories.orders_repo.create_order_proposal", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_proposal

        res = asyncio.run(order_tools.create_order_proposal(product_id=102, quantity=1))
        assert res["status"] == "success"
        data = res["data"]
        assert data["id"] == 50
        assert data["status"] == "pending"
        assert data["quoted_unit_price_inr"] == 49990.0
        assert "No payment has been charged" in data["notice"]


def test_create_order_proposal_insufficient_stock():
    """Verify proposal creation fails when stock is insufficient."""
    with patch("ecommerce_agent.db.repositories.orders_repo.create_order_proposal", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = {"error": "Cannot create proposal for 50 units. Only 15 currently available in stock."}

        res = asyncio.run(order_tools.create_order_proposal(product_id=102, quantity=50))
        assert res["status"] == "error"
        assert "available in stock" in res["message"]


def test_cancellation_eligibility_placed_order():
    """Verify orders in 'placed' status are eligible for cancellation."""
    mock_eligibility = OrderCancellationEligibility(
        order_id=5,
        order_number="ORD-1005",
        current_status="placed",
        is_eligible_for_cancellation=True,
        reason="Order is in 'placed' status.",
        policy_explanation="Store policy explanation.",
    )

    with patch("ecommerce_agent.db.repositories.orders_repo.check_order_cancellation_eligibility", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_eligibility

        res = asyncio.run(order_tools.check_order_cancellation_eligibility(order_id=5))
        assert res["status"] == "success"
        assert res["data"]["is_eligible_for_cancellation"] is True


def test_cancellation_eligibility_shipped_order():
    """Verify orders in 'shipped' status cannot be cancelled."""
    mock_eligibility = OrderCancellationEligibility(
        order_id=3,
        order_number="ORD-1003",
        current_status="shipped",
        is_eligible_for_cancellation=False,
        reason="Order is currently 'shipped'.",
        policy_explanation="Store policy explanation.",
    )

    with patch("ecommerce_agent.db.repositories.orders_repo.check_order_cancellation_eligibility", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_eligibility

        res = asyncio.run(order_tools.check_order_cancellation_eligibility(order_id=3))
        assert res["status"] == "success"
        assert res["data"]["is_eligible_for_cancellation"] is False


def test_update_order_proposal_success():
    """Verify updating proposal quantity recalculates total and keeps pending status."""
    mock_updated = OrderProposalResponse(
        id=50,
        user_id=1,
        product_id=102,
        product_name="Lenovo IdeaPad Slim 3 Demo",
        quantity=2,
        quoted_unit_price_inr=49990.0,
        total_estimated_inr=99980.0,
        status="pending",
        idempotency_key="prop-abc-123",
        expires_at="2026-11-20T12:00:00Z",
        created_at="2026-11-20T11:45:00Z",
    )

    with patch("ecommerce_agent.db.repositories.orders_repo.update_order_proposal", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_updated

        res = asyncio.run(order_tools.update_order_proposal(proposal_id=50, quantity=2))
        assert res["status"] == "success"
        assert res["data"]["quantity"] == 2
        assert res["data"]["total_estimated_inr"] == 99980.0


def test_cancel_order_proposal_success():
    """Verify cancelling an existing pending proposal."""
    with patch("ecommerce_agent.db.repositories.orders_repo.cancel_order_proposal", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = {"status": "success", "message": "Proposal #50 has been cancelled."}

        res = asyncio.run(order_tools.cancel_order_proposal(proposal_id=50))
        assert res["status"] == "success"
        assert "cancelled" in res["message"]
