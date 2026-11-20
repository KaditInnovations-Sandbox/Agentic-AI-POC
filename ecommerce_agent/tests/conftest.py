"""Test configuration and fixtures for ecommerce_agent."""

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from ecommerce_agent.db.models import (
    Cart,
    CartItem,
    Category,
    Inventory,
    Order,
    OrderItem,
    OrderProposal,
    Product,
    Review,
    SupportTicket,
    User,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def sample_user():
    return User(
        id=1,
        full_name="Asha Kumar",
        email="asha@example.test",
        role="customer",
        preferences={"preferred_brands": ["Dell", "Lenovo"], "budget_inr": 60000},
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_categories():
    c_electronics = Category(id=1, name="Electronics", parent_id=None)
    c_computers = Category(id=2, name="Computers", parent_id=1)
    c_laptops = Category(id=3, name="Laptops", parent_id=2)
    c_audio = Category(id=4, name="Audio", parent_id=1)
    return [c_electronics, c_computers, c_laptops, c_audio]


@pytest.fixture
def sample_products(sample_categories):
    p1 = Product(
        id=101,
        category_id=3,
        sku="LAP-DEL-101",
        name="Dell Inspiron 14 Demo",
        brand="Dell",
        description="14-inch everyday productivity laptop",
        price_inr=Decimal("54990.00"),
        features={"battery_hours_claimed": 9, "backlit_keyboard": True},
        specs={"ram_gb": 16, "storage_gb": 512, "processor": "Core i5", "weight_kg": 1.55},
        tags=["laptop", "office", "lightweight"],
        active=True,
    )
    p1.inventory = Inventory(product_id=101, stock_qty=8, reserved_qty=0, reorder_threshold=3)
    p1.category = sample_categories[2]
    p1.reviews = [
        Review(
            id=1,
            product_id=101,
            user_id=1,
            rating=5,
            title="Great office laptop",
            body="Good performance.",
            created_at=datetime.now(timezone.utc),
        )
    ]

    p2 = Product(
        id=102,
        category_id=3,
        sku="LAP-LEN-102",
        name="Lenovo IdeaPad Slim 3 Demo",
        brand="Lenovo",
        description="Slim laptop for students",
        price_inr=Decimal("49990.00"),
        features={"battery_hours_claimed": 8, "backlit_keyboard": False},
        specs={"ram_gb": 16, "storage_gb": 512, "processor": "Ryzen 5", "weight_kg": 1.62},
        tags=["laptop", "student"],
        active=True,
    )
    p2.inventory = Inventory(product_id=102, stock_qty=15, reserved_qty=0, reorder_threshold=5)
    p2.category = sample_categories[2]
    p2.reviews = [
        Review(
            id=2,
            product_id=102,
            user_id=2,
            rating=4,
            title="Good value",
            body="Solid for students.",
            created_at=datetime.now(timezone.utc),
        )
    ]

    p3 = Product(
        id=105,
        category_id=3,
        sku="LAP-ACE-105",
        name="Acer Aspire Lite Demo",
        brand="Acer",
        description="Affordable laptop",
        price_inr=Decimal("38990.00"),
        features={"battery_hours_claimed": 6, "backlit_keyboard": False},
        specs={"ram_gb": 8, "storage_gb": 512, "processor": "Ryzen 3", "weight_kg": 1.75},
        tags=["laptop", "budget"],
        active=True,
    )
    # Out of stock
    p3.inventory = Inventory(product_id=105, stock_qty=0, reserved_qty=0, reorder_threshold=4)
    p3.category = sample_categories[2]
    p3.reviews = []

    return [p1, p2, p3]
