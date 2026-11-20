"""Shopping cart repository: retrieval, additions, quantity updates, and item removal."""

from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ecommerce_agent.db.models import Cart, CartItem, Inventory, Product
from ecommerce_agent.schemas.cart import CartActionResponse, CartItemDetail, CartResponse


async def get_cart(session: AsyncSession, user_id: int) -> CartResponse:
    """Retrieves current customer's cart.

    SAFETY: Does NOT silently create a database cart row if none exists.
    """
    stmt = (
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(
            selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.inventory)
        )
        .execution_options(populate_existing=True)
    )
    res = await session.execute(stmt)
    cart = res.scalars().first()

    if not cart or not cart.items:
        return CartResponse(
            user_id=user_id,
            cart_id=cart.id if cart else None,
            items=[],
            total_items=0,
            cart_total_inr=0.0,
        )

    items: list[CartItemDetail] = []
    total_inr = Decimal("0.00")
    total_qty = 0

    for ci in cart.items:
        prod = ci.product
        unit_price = prod.price_inr
        line_total = Decimal(ci.quantity) * unit_price
        avail_qty = prod.inventory.available_qty if prod.inventory else 0

        items.append(
            CartItemDetail(
                product_id=prod.id,
                sku=prod.sku,
                name=prod.name,
                brand=prod.brand,
                unit_price_inr=float(unit_price),
                quantity=ci.quantity,
                line_total_inr=float(line_total),
                available_qty=avail_qty,
                in_stock=avail_qty >= ci.quantity,
            )
        )
        total_inr += line_total
        total_qty += ci.quantity

    return CartResponse(
        user_id=user_id,
        cart_id=cart.id,
        items=items,
        total_items=total_qty,
        cart_total_inr=float(total_inr),
    )


async def add_to_cart(
    session: AsyncSession,
    user_id: int,
    product_id: int,
    quantity: int,
) -> CartActionResponse:
    """Adds a product to the cart with explicit inventory validation."""
    if quantity <= 0:
        return CartActionResponse(
            status="error",
            message="Quantity must be greater than zero.",
            cart=await get_cart(session, user_id),
        )

    # 1. Verify product and inventory
    prod_stmt = (
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.inventory))
    )
    prod_res = await session.execute(prod_stmt)
    product = prod_res.scalars().first()

    if not product or not product.active:
        return CartActionResponse(
            status="error",
            message=f"Product ID {product_id} is not available or inactive.",
            cart=await get_cart(session, user_id),
        )

    avail_qty = product.inventory.available_qty if product.inventory else 0

    # 2. Find or create cart for this user
    cart_stmt = (
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(selectinload(Cart.items))
    )
    cart_res = await session.execute(cart_stmt)
    cart = cart_res.scalars().first()

    if not cart:
        cart = Cart(user_id=user_id)
        session.add(cart)
        await session.flush()

    # 3. Check existing quantity in cart
    existing_item = next((item for item in cart.items if item.product_id == product_id), None)
    current_qty_in_cart = existing_item.quantity if existing_item else 0
    new_total_qty = current_qty_in_cart + quantity

    if new_total_qty > avail_qty:
        return CartActionResponse(
            status="error",
            message=(
                f"Cannot add {quantity} units. Only {avail_qty} available in stock "
                f"({current_qty_in_cart} already in your cart)."
            ),
            cart=await get_cart(session, user_id),
        )

    # 4. Upsert item
    if existing_item:
        existing_item.quantity = new_total_qty
    else:
        new_item = CartItem(cart_id=cart.id, product_id=product_id, quantity=quantity)
        session.add(new_item)

    cart.updated_at = datetime.now(timezone.utc)
    await session.commit()

    updated_cart = await get_cart(session, user_id)
    return CartActionResponse(
        status="success",
        message=f"Successfully added {quantity} unit(s) of '{product.name}' to cart.",
        cart=updated_cart,
    )


async def update_cart_item(
    session: AsyncSession,
    user_id: int,
    product_id: int,
    quantity: int,
) -> CartActionResponse:
    """Updates the quantity of an existing item in the cart."""
    if quantity <= 0:
        return CartActionResponse(
            status="error",
            message="Quantity must be greater than zero. To remove the item, please use remove_cart_item.",
            cart=await get_cart(session, user_id),
        )

    # 1. Fetch cart
    cart_stmt = (
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(selectinload(Cart.items))
    )
    cart_res = await session.execute(cart_stmt)
    cart = cart_res.scalars().first()

    if not cart:
        return CartActionResponse(
            status="error",
            message="No active cart found.",
            cart=await get_cart(session, user_id),
        )

    target_item = next((item for item in cart.items if item.product_id == product_id), None)
    if not target_item:
        return CartActionResponse(
            status="error",
            message=f"Product ID {product_id} is not in your cart.",
            cart=await get_cart(session, user_id),
        )

    # 2. Verify stock
    prod_stmt = select(Product).where(Product.id == product_id).options(selectinload(Product.inventory))
    prod_res = await session.execute(prod_stmt)
    product = prod_res.scalars().first()

    avail_qty = product.inventory.available_qty if product and product.inventory else 0
    if quantity > avail_qty:
        return CartActionResponse(
            status="error",
            message=f"Cannot update to {quantity} units. Only {avail_qty} available in stock.",
            cart=await get_cart(session, user_id),
        )

    target_item.quantity = quantity
    cart.updated_at = datetime.now(timezone.utc)
    await session.commit()

    updated_cart = await get_cart(session, user_id)
    return CartActionResponse(
        status="success",
        message=f"Updated '{product.name}' quantity to {quantity}.",
        cart=updated_cart,
    )


async def remove_cart_item(
    session: AsyncSession,
    user_id: int,
    product_id: int,
) -> CartActionResponse:
    """Removes a product from the cart upon explicit request."""
    cart_stmt = (
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(selectinload(Cart.items))
    )
    cart_res = await session.execute(cart_stmt)
    cart = cart_res.scalars().first()

    if not cart:
        return CartActionResponse(
            status="error",
            message="No active cart found.",
            cart=await get_cart(session, user_id),
        )

    target_item = next((item for item in cart.items if item.product_id == product_id), None)
    if not target_item:
        return CartActionResponse(
            status="error",
            message=f"Product ID {product_id} is not in your cart.",
            cart=await get_cart(session, user_id),
        )

    await session.delete(target_item)
    cart.updated_at = datetime.now(timezone.utc)
    await session.commit()

    updated_cart = await get_cart(session, user_id)
    return CartActionResponse(
        status="success",
        message=f"Removed product ID {product_id} from your cart.",
        cart=updated_cart,
    )
