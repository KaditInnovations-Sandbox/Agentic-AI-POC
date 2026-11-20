"""Tools package for ecommerce_agent."""

from ecommerce_agent.tools.analytics import get_order_value_summary, get_spending_summary
from ecommerce_agent.tools.cart import add_to_cart, get_cart, remove_cart_item, update_cart_item
from ecommerce_agent.tools.orders import (
    cancel_order_proposal,
    check_order_cancellation_eligibility,
    create_order_proposal,
    get_order_details,
    get_order_history,
    get_order_proposal,
    update_order_proposal,
)
from ecommerce_agent.tools.products import (
    compare_products,
    get_available_filters,
    get_product_details,
    search_products,
)
from ecommerce_agent.tools.support import (
    cancel_support_ticket_draft,
    get_support_tickets,
    prepare_support_ticket_draft,
    update_support_ticket_draft,
)

__all__ = [
    "get_available_filters",
    "search_products",
    "get_product_details",
    "compare_products",
    "get_cart",
    "add_to_cart",
    "update_cart_item",
    "remove_cart_item",
    "get_order_history",
    "get_order_details",
    "create_order_proposal",
    "get_order_proposal",
    "update_order_proposal",
    "cancel_order_proposal",
    "check_order_cancellation_eligibility",
    "get_support_tickets",
    "prepare_support_ticket_draft",
    "update_support_ticket_draft",
    "cancel_support_ticket_draft",
    "get_order_value_summary",
    "get_spending_summary",
]
