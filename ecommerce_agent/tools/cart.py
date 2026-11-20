"""ADK Shopping Cart Tools for Shopity."""

from ecommerce_agent.db.connection import get_db_session
from ecommerce_agent.db.repositories import cart_repo
from ecommerce_agent.services.auth import get_current_user_id


async def get_cart() -> dict:
    """Retrieves the current customer's shopping cart items, line totals, and overall total.

    Returns:
        dict: The customer's cart contents, line totals, quantities, and availability status.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            cart = await cart_repo.get_cart(session, user_id=user_id)
            return {"status": "success", "data": cart.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Failed to retrieve cart: {str(e)}"}


async def add_to_cart(product_id: int, quantity: int = 1) -> dict:
    """Adds an explicitly selected product and quantity to the customer's cart after validation.

    Use this tool ONLY when the customer has explicitly requested adding a product.

    Args:
        product_id: The ID of the product to add.
        quantity: The number of units to add (default 1). Must be greater than 0.

    Returns:
        dict: Operation status, confirmation message, and updated cart contents.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            result = await cart_repo.add_to_cart(
                session, user_id=user_id, product_id=product_id, quantity=quantity
            )
            return {"status": result.status, "message": result.message, "data": result.cart.model_dump() if result.cart else None}
    except Exception as e:
        return {"status": "error", "message": f"Failed to add to cart: {str(e)}"}


async def update_cart_item(product_id: int, quantity: int) -> dict:
    """Updates the quantity of an item already in the customer's cart.

    Use this tool ONLY when the customer explicitly asks to change an item's quantity.

    Args:
        product_id: The ID of the product to update.
        quantity: The new desired quantity (must be greater than 0).

    Returns:
        dict: Operation status, confirmation message, and updated cart.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            result = await cart_repo.update_cart_item(
                session, user_id=user_id, product_id=product_id, quantity=quantity
            )
            return {"status": result.status, "message": result.message, "data": result.cart.model_dump() if result.cart else None}
    except Exception as e:
        return {"status": "error", "message": f"Failed to update cart item: {str(e)}"}


async def remove_cart_item(product_id: int) -> dict:
    """Removes an item from the customer's cart on explicit request.

    Use this tool ONLY when the customer explicitly asks to remove a product from their cart.

    Args:
        product_id: The ID of the product to remove.

    Returns:
        dict: Operation status, confirmation message, and updated cart.
    """
    try:
        user_id = get_current_user_id()
        async with get_db_session() as session:
            result = await cart_repo.remove_cart_item(
                session, user_id=user_id, product_id=product_id
            )
            return {"status": result.status, "message": result.message, "data": result.cart.model_dump() if result.cart else None}
    except Exception as e:
        return {"status": "error", "message": f"Failed to remove cart item: {str(e)}"}
