"""Repositories package for ecommerce_agent database access."""

from ecommerce_agent.db.repositories.analytics_repo import get_order_value_summary
from ecommerce_agent.db.repositories.cart_repo import (
    add_to_cart,
    get_cart,
    remove_cart_item,
    update_cart_item,
)
from ecommerce_agent.db.repositories.orders_repo import (
    check_order_cancellation_eligibility,
    create_order_proposal,
    get_order_details,
    get_order_history,
    get_order_proposal,
)
from ecommerce_agent.db.repositories.products_repo import (
    compare_products,
    get_available_filters,
    get_product_details,
    search_products,
)
from ecommerce_agent.db.repositories.support_repo import get_support_tickets

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
    "check_order_cancellation_eligibility",
    "get_support_tickets",
    "get_order_value_summary",
]
