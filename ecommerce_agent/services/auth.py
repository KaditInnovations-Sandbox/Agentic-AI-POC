"""Mock authentication and customer context services.

WARNING: DEVELOPMENT ONLY.
In a production deployment, user identity must be extracted from verified
JWT / OAuth tokens or secure session headers, NEVER from model arguments.
"""

from contextvars import ContextVar
from typing import Any
from fastapi import Request
from ecommerce_agent.config import settings

# Seeded customer profiles matching ecommerce_poc.sql
DEFAULT_USER_PROFILES: dict[int, dict[str, Any]] = {
    1: {
        "id": 1,
        "full_name": "Asha Kumar",
        "email": "asha@example.test",
        "role": "customer",
        "preferences": {"preferred_brands": ["Dell", "Lenovo"], "budget_inr": 60000},
    },
    2: {
        "id": 2,
        "full_name": "Rahul Menon",
        "email": "rahul@example.test",
        "role": "customer",
        "preferences": {"preferred_categories": ["Audio"]},
    },
    3: {
        "id": 3,
        "full_name": "Priya Shah",
        "email": "priya@example.test",
        "role": "customer",
        "preferences": {},
    },
    4: {
        "id": 4,
        "full_name": "Demo Admin",
        "email": "admin@example.test",
        "role": "admin",
        "preferences": {},
    },
}

_request_user_id: ContextVar[int | None] = ContextVar("request_user_id", default=None)


def set_request_user_id(user_id: int | None) -> None:
    """Sets the request-scoped user ID from the HTTP request context."""
    _request_user_id.set(user_id)


def get_current_user_id() -> int:
    """Retrieves the trusted customer ID for the current session/request.

    Enforces server-side customer identity. Tools never accept user_id
    as an LLM-supplied argument to prevent model identity tampering.
    """
    req_uid = _request_user_id.get()
    if req_uid is not None:
        return req_uid
    return settings.mock_user_id


def resolve_user_id_from_request(request: Request) -> int:
    """Extracts the user ID from the HTTP headers, query params, or default."""
    header_val = request.headers.get("x-user-id")
    if header_val:
        try:
            return int(header_val)
        except ValueError:
            pass
    query_val = request.query_params.get("user_id")
    if query_val:
        try:
            return int(query_val)
        except ValueError:
            pass
    return get_current_user_id()


async def get_current_user_profile(user_id: int | None = None) -> dict[str, Any]:
    """Retrieves the customer profile and preferences.

    Attempts to query the live PostgreSQL database first; falls back
    to seeded mock user data if the database is offline or during testing.
    """
    uid = user_id if user_id is not None else get_current_user_id()
    try:
        from sqlalchemy import select
        from ecommerce_agent.db.connection import get_db_session
        from ecommerce_agent.db.models import User

        async with get_db_session() as session:
            stmt = select(User).where(User.id == uid)
            res = await session.execute(stmt)
            user = res.scalars().first()
            if user:
                return {
                    "id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                    "preferences": user.preferences or {},
                    "editable": False,
                }
    except Exception:
        # Fall back gracefully to seeded profile if database is disconnected
        pass

    fallback = DEFAULT_USER_PROFILES.get(
        uid,
        {
            "id": uid,
            "full_name": f"Customer #{uid}",
            "email": f"customer{uid}@example.test",
            "role": "customer",
            "preferences": {},
        },
    )
    result = dict(fallback)
    result["editable"] = False
    return result
