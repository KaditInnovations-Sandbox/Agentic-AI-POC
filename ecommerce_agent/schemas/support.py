"""Pydantic schemas for customer support tickets, drafts, and order value analytics."""

from typing import Any
from pydantic import BaseModel, Field


class SupportTicketDetail(BaseModel):
    id: int
    ticket_number: str
    user_id: int
    order_id: int | None = None
    subject: str
    description: str
    status: str
    created_at: str


class TicketDraftResponse(BaseModel):
    draft_id: str
    user_id: int
    order_id: int | None = None
    subject: str
    description: str
    status: str = "DRAFT_PENDING_APPROVAL"
    created_at: str
    notice: str


class OrderValueSummary(BaseModel):
    user_id: int
    eligible_order_count: int
    total_eligible_order_value_inr: float
    average_order_value_inr: float
    status_breakdown: dict[str, dict[str, Any]] = Field(default_factory=dict)
    cancelled_orders_count: int = 0
    cancelled_orders_value_inr: float = 0.0
    note: str = (
        "Calculated from recorded orders using SQL aggregation. "
        "Represents gross order value, not verified payment transactions. "
        "Eligible statuses: placed, packed, shipped, delivered. Excludes cancelled orders."
    )
