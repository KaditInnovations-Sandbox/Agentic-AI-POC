"""Integration tests against PostgreSQL ecommerce_demo database.

Uses NullPool to ensure connections are not shared across separate asyncio test runs on Windows.
"""

import asyncio
import pytest
from sqlalchemy import text
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from ecommerce_agent.config import settings
from ecommerce_agent.db.repositories import (
    analytics_repo,
    cart_repo,
    orders_repo,
    products_repo,
)

def _get_test_session_factory():
    engine = create_async_engine(
        settings.database_url,
        poolclass=NullPool,
        connect_args={"server_settings": {"search_path": f"{settings.db_schema}, public"}},
    )
    return async_sessionmaker(bind=engine, expire_on_commit=False)

async def _can_connect_to_postgres() -> bool:
    try:
        factory = _get_test_session_factory()
        async with factory() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

# Check connectivity
try:
    _pg_reachable = asyncio.run(_can_connect_to_postgres())
except Exception:
    _pg_reachable = False


@pytest.mark.skipif(not _pg_reachable, reason="PostgreSQL ecommerce_demo is not accessible in this environment")
class TestPostgresIntegration:
    """Integration test suite executing real SQL queries against ecommerce_demo."""

    def test_real_filter_discovery(self):
        async def run_test():
            factory = _get_test_session_factory()
            async with factory() as session:
                filters = await products_repo.get_available_filters(session, category_id=3)
                assert len(filters.categories) > 0
                assert "Dell" in filters.brands
                assert filters.price_range.min_price_inr > 0

        asyncio.run(run_test())

    def test_real_search_dell_laptop(self):
        async def run_test():
            factory = _get_test_session_factory()
            async with factory() as session:
                res = await products_repo.search_products(session, brand="Dell")
                assert res.total_count >= 1
                skus = [p.sku for p in res.products]
                assert "LAP-DEL-101" in skus

        asyncio.run(run_test())

    def test_real_cart_retrieval(self):
        async def run_test():
            factory = _get_test_session_factory()
            async with factory() as session:
                cart = await cart_repo.get_cart(session, user_id=1)
                assert cart.user_id == 1
                assert len(cart.items) >= 1

        asyncio.run(run_test())

    def test_real_orders_history(self):
        async def run_test():
            factory = _get_test_session_factory()
            async with factory() as session:
                orders = await orders_repo.get_order_history(session, user_id=1)
                assert len(orders) >= 3
                numbers = [o.order_number for o in orders]
                assert "ORD-1001" in numbers

        asyncio.run(run_test())

    def test_real_order_value_summary(self):
        async def run_test():
            factory = _get_test_session_factory()
            async with factory() as session:
                summary = await analytics_repo.get_order_value_summary(session, user_id=1)
                assert summary.user_id == 1
                assert summary.total_eligible_order_value_inr > 0
                assert summary.eligible_order_count >= 3

        asyncio.run(run_test())
