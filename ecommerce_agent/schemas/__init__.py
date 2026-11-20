"""Pydantic schemas package for ecommerce_agent."""

from ecommerce_agent.schemas.cart import CartActionResponse, CartItemDetail, CartResponse
from ecommerce_agent.schemas.orders import (
    OrderCancellationEligibility,
    OrderDetail,
    OrderItemDetail,
    OrderProposalResponse,
    OrderSummary,
)
from ecommerce_agent.schemas.products import (
    AvailableFiltersResponse,
    FilterCategory,
    PriceRange,
    ProductComparison,
    ProductDetail,
    ProductSearchResult,
    ProductSummary,
    ReviewSummary,
)
from ecommerce_agent.schemas.support import (
    OrderValueSummary,
    SupportTicketDetail,
    TicketDraftResponse,
)

__all__ = [
    "FilterCategory",
    "PriceRange",
    "AvailableFiltersResponse",
    "ProductSummary",
    "ProductSearchResult",
    "ReviewSummary",
    "ProductDetail",
    "ProductComparison",
    "CartItemDetail",
    "CartResponse",
    "CartActionResponse",
    "OrderItemDetail",
    "OrderSummary",
    "OrderDetail",
    "OrderProposalResponse",
    "OrderCancellationEligibility",
    "SupportTicketDetail",
    "TicketDraftResponse",
    "OrderValueSummary",
]
