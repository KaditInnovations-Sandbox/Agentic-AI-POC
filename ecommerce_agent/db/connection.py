"""Database connection and session factory using SQLAlchemy 2.x and asyncpg."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from sqlalchemy.pool import NullPool

from ecommerce_agent.config import settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Returns the singleton AsyncEngine for PostgreSQL."""
    global _engine
    if _engine is None:
        connect_args: dict[str, Any] = {}
        # Configure search_path for postgres schema ecommerce_poc
        if "postgresql" in settings.database_url:
            connect_args["server_settings"] = {
                "search_path": f"{settings.db_schema}, public"
            }

        _engine = create_async_engine(
            settings.database_url,
            echo=False,
            future=True,
            connect_args=connect_args,
            poolclass=NullPool,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Returns the async session factory."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


@asynccontextmanager
async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Async context manager providing a scoped database session.

    Commits or rolls back transactions safely.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


def set_engine_and_factory(
    engine: AsyncEngine,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """Allows test suites to inject custom engines/factories (e.g. SQLite / mocks)."""
    global _engine, _session_factory
    _engine = engine
    _session_factory = session_factory


def reset_engine() -> None:
    """Resets the engine and session factory to default."""
    global _engine, _session_factory
    _engine = None
    _session_factory = None
