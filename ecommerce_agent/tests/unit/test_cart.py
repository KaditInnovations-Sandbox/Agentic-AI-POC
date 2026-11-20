"""Unit tests for shopping cart tools."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from ecommerce_agent.schemas.cart import CartActionResponse, CartItemDetail, CartResponse
from ecommerce_agent.tools import cart as cart_tools


def test_get_cart_empty_no_silent_creation():
    """Verify that get_cart returns an empty response without creating rows."""
    mock_empty_cart = CartResponse(user_id=1, cart_id=None, items=[], total_items=0, cart_total_inr=0.0)

    with patch("ecommerce_agent.db.repositories.cart_repo.get_cart", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_empty_cart

        res = asyncio.run(cart_tools.get_cart())
        assert res["status"] == "success"
        data = res["data"]
        assert data["user_id"] == 1
        assert data["items"] == []
        assert data["total_items"] == 0
        assert data["cart_total_inr"] == 0.0


def test_add_to_cart_success():
    """Test adding an available product to the cart."""
    mock_action = CartActionResponse(
        status="success",
        message="Successfully added 1 unit(s) of 'Dell Inspiron 14 Demo' to cart.",
        cart=CartResponse(
            user_id=1,
            cart_id=10,
            items=[
                CartItemDetail(
                    product_id=101,
                    sku="LAP-DEL-101",
                    name="Dell Inspiron 14 Demo",
                    brand="Dell",
                    unit_price_inr=54990.0,
                    quantity=1,
                    line_total_inr=54990.0,
                    available_qty=8,
                    in_stock=True,
                )
            ],
            total_items=1,
            cart_total_inr=54990.0,
        ),
    )

    with patch("ecommerce_agent.db.repositories.cart_repo.add_to_cart", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_action

        res = asyncio.run(cart_tools.add_to_cart(product_id=101, quantity=1))
        assert res["status"] == "success"
        assert "Successfully added" in res["message"]
        assert res["data"]["total_items"] == 1


def test_add_to_cart_insufficient_stock():
    """Test rejection when requested quantity exceeds available inventory."""
    mock_action = CartActionResponse(
        status="error",
        message="Cannot add 20 units. Only 8 available in stock (0 already in your cart).",
        cart=None,
    )

    with patch("ecommerce_agent.db.repositories.cart_repo.add_to_cart", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_action

        res = asyncio.run(cart_tools.add_to_cart(product_id=101, quantity=20))
        assert res["status"] == "error"
        assert "available in stock" in res["message"]


def test_update_cart_item_quantity():
    """Test updating cart item quantity."""
    mock_action = CartActionResponse(
        status="success",
        message="Updated 'Dell Inspiron 14 Demo' quantity to 2.",
        cart=CartResponse(
            user_id=1,
            cart_id=10,
            items=[
                CartItemDetail(
                    product_id=101,
                    sku="LAP-DEL-101",
                    name="Dell Inspiron 14 Demo",
                    brand="Dell",
                    unit_price_inr=54990.0,
                    quantity=2,
                    line_total_inr=109980.0,
                    available_qty=8,
                    in_stock=True,
                )
            ],
            total_items=2,
            cart_total_inr=109980.0,
        ),
    )

    with patch("ecommerce_agent.db.repositories.cart_repo.update_cart_item", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_action

        res = asyncio.run(cart_tools.update_cart_item(product_id=101, quantity=2))
        assert res["status"] == "success"
        assert res["data"]["total_items"] == 2
        assert res["data"]["cart_total_inr"] == 109980.0


def test_remove_cart_item():
    """Test removing an item from the cart."""
    mock_action = CartActionResponse(
        status="success",
        message="Removed product ID 101 from your cart.",
        cart=CartResponse(user_id=1, cart_id=10, items=[], total_items=0, cart_total_inr=0.0),
    )

    with patch("ecommerce_agent.db.repositories.cart_repo.remove_cart_item", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_action

        res = asyncio.run(cart_tools.remove_cart_item(product_id=101))
        assert res["status"] == "success"
        assert "Removed product" in res["message"]
        assert res["data"]["total_items"] == 0
