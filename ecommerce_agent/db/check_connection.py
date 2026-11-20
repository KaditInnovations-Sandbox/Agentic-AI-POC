"""Database connection health check utility for ecommerce_agent."""

import asyncio
import logging
from sqlalchemy import text
from ecommerce_agent.config import settings
from ecommerce_agent.db.connection import get_engine

logger = logging.getLogger("ecommerce_agent.db.healthcheck")


async def check_db_connection() -> dict:
    """Checks whether the database connection is working and returns diagnostic info."""
    redacted_url = settings.database_url
    if "@" in redacted_url:
        prefix, rest = redacted_url.split("@", 1)
        if ":" in prefix:
            scheme_user, _ = prefix.rsplit(":", 1)
            redacted_url = f"{scheme_user}:****@{rest}"

    try:
        engine = get_engine()
        async with engine.connect() as conn:
            # 1. Basic query check
            res = await conn.execute(text("SELECT current_database(), current_user, version();"))
            row = res.fetchone()
            current_db = row[0]
            current_user = row[1]
            pg_version = row[2]

            # 2. Schema tables check
            schema_stmt = text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = :schema ORDER BY table_name;"
            )
            tables_res = await conn.execute(schema_stmt, {"schema": settings.db_schema})
            tables = [r[0] for r in tables_res.fetchall()]

            # 3. Product count check
            product_count = 0
            if "products" in tables:
                cnt_res = await conn.execute(
                    text(f"SELECT count(*) FROM {settings.db_schema}.products;")
                )
                product_count = cnt_res.scalar_one_or_none() or 0

            status_msg = (
                f"[DB HEALTHCHECK SUCCESS] Connected to '{current_db}' as user '{current_user}'.\n"
                f"Schema '{settings.db_schema}' found with {len(tables)} tables ({product_count} products loaded)."
            )
            print(f"\n{'='*70}\n{status_msg}\n{'='*70}\n", flush=True)

            return {
                "status": "connected",
                "database": current_db,
                "user": current_user,
                "schema": settings.db_schema,
                "tables": tables,
                "product_count": product_count,
                "url": redacted_url,
            }

    except Exception as exc:
        err_type = type(exc).__name__
        err_detail = str(exc)
        status_msg = (
            f"[DB HEALTHCHECK WARNING] Could not connect to PostgreSQL via '{redacted_url}'.\n"
            f"Error [{err_type}]: {err_detail}\n\n"
            f"Troubleshooting Steps:\n"
            f"1. Update the password/credentials in 'ecommerce_agent/.env' under DATABASE_URL.\n"
            f"   Example: DATABASE_URL=postgresql+asyncpg://<user>:<password>@localhost:5432/ecommerce_demo\n"
            f"2. Ensure PostgreSQL service is running on the specified host and port.\n"
            f"3. Ensure 'ecommerce_demo' database is seeded with 'ecommerce_poc.sql'."
        )
        print(f"\n{'!'*70}\n{status_msg}\n{'!'*70}\n", flush=True)

        return {
            "status": "error",
            "error_type": err_type,
            "error_message": err_detail,
            "url": redacted_url,
            "troubleshooting": [
                "Update password/credentials in ecommerce_agent/.env",
                "Ensure PostgreSQL service is active on localhost:5432",
                "Seed database using: psql -U postgres -d ecommerce_demo -f ecommerce_poc.sql",
            ],
        }


def run_startup_db_check() -> None:
    """Non-blocking startup check executed when the module is loaded."""
    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            loop.create_task(check_db_connection())
    except Exception as e:
        logger.debug(f"Startup DB check task could not be scheduled: {e}")


if __name__ == "__main__":
    asyncio.run(check_db_connection())
