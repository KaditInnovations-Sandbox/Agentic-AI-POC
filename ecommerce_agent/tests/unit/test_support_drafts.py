"""Unit tests for support ticket drafts and tickets retrieval."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from ecommerce_agent.schemas.support import SupportTicketDetail
from ecommerce_agent.tools import support as support_tools


def test_prepare_support_ticket_draft_success():
    """Verify draft creation generates preview without database ticket insertion."""
    res = asyncio.run(
        support_tools.prepare_support_ticket_draft(
            subject="Damaged headphone packaging",
            description="The outer box was dented upon arrival.",
            order_id=None,
        )
    )
    assert res["status"] == "success"
    data = res["data"]
    assert data["draft_id"].startswith("DFT-")
    assert data["status"] == "DRAFT_PENDING_APPROVAL"
    assert "A support ticket has NOT yet been created" in data["notice"]


def test_prepare_support_ticket_draft_order_ownership():
    """Verify draft creation verifies order ownership when order_id is provided."""
    with patch("ecommerce_agent.db.repositories.orders_repo.get_order_details", new_callable=AsyncMock) as mock_order_repo:
        # User doesn't own order 99
        mock_order_repo.return_value = None

        res = asyncio.run(
            support_tools.prepare_support_ticket_draft(
                subject="Inquiry about order",
                description="Where is it?",
                order_id=99,
            )
        )
        assert res["status"] == "error"
        assert "not found or does not belong" in res["message"]


def test_get_support_tickets():
    """Test retrieving submitted support tickets."""
    mock_tickets = [
        SupportTicketDetail(
            id=1,
            ticket_number="TKT-501",
            user_id=1,
            order_id=2,
            subject="Damaged headphone packaging",
            description="Packaging was damaged.",
            status="open",
            created_at="2026-11-10 10:00 UTC",
        )
    ]

    with patch("ecommerce_agent.db.repositories.support_repo.get_support_tickets", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_tickets

        res = asyncio.run(support_tools.get_support_tickets())
        assert res["status"] == "success"
        data = res["data"]
        assert len(data) == 1
        assert data[0]["ticket_number"] == "TKT-501"


def test_update_support_ticket_draft_success():
    """Verify modifying draft subject and description in-memory."""
    # First create a draft
    created = asyncio.run(
        support_tools.prepare_support_ticket_draft(
            subject="Initial Subject",
            description="Initial Description",
            order_id=None,
        )
    )
    draft_id = created["data"]["draft_id"]

    # Now update it
    updated = asyncio.run(
        support_tools.update_support_ticket_draft(
            draft_id=draft_id,
            subject="Updated Subject",
            description="Updated Description with more detail",
        )
    )
    assert updated["status"] == "success"
    assert updated["data"]["subject"] == "Updated Subject"
    assert updated["data"]["description"] == "Updated Description with more detail"


def test_cancel_support_ticket_draft_success():
    """Verify discarding an existing ticket draft."""
    created = asyncio.run(
        support_tools.prepare_support_ticket_draft(
            subject="To be cancelled",
            description="Will be discarded",
            order_id=None,
        )
    )
    draft_id = created["data"]["draft_id"]

    cancelled = asyncio.run(support_tools.cancel_support_ticket_draft(draft_id=draft_id))
    assert cancelled["status"] == "success"
    assert "discarded" in cancelled["message"]
