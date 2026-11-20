"""Pydantic schemas for order history, details, proposals, and cancellation eligibility."""

from typing import Any
from pydantic import BaseModel, Field


class OrderItemDetail(BaseModel):
    product_id: int
    sku: str
    name: str
    brand: str
    quantity: int
    unit_price_inr: float
    line_total_inr: float


class OrderSummary(BaseModel):
    id: int
    order_number: str
    status: str
    total_inr: float
    placed_at: str
    item_count: int


class OrderDetail(BaseModel):
    id: int
    order_number: str
    user_id: int
    status: str
    total_inr: float
    shipping_address: dict[str, Any]
    placed_at: str
    items: list[OrderItemDetail] = Field(default_factory=list)


class OrderProposalResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    product_name: str
    quantity: int
    quoted_unit_price_inr: float
    total_estimated_inr: float
    status: str = "pending"
    idempotency_key: str
    expires_at: str
    created_at: str
    notice: str = (
        "This is an instant 15-minute price lock and checkout preview. "
        "No payment has been charged. "
        "Review the details and click 'Approve & Place Order' when you're ready to complete your purchase."
    )


class OrderCancellationEligibility(BaseModel):
    order_id: int
    order_number: str
    current_status: str
    is_eligible_for_cancellation: bool
    reason: str
    policy_explanation: str
