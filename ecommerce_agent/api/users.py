"""REST API endpoints for user profiles and demo user switcher."""

from typing import Any
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ecommerce_agent.db.connection import get_db_session
from ecommerce_agent.services.auth import (
    DEFAULT_USER_PROFILES,
    get_current_user_profile,
    resolve_user_id_from_request,
)

router = APIRouter(prefix="/api", tags=["Users & Profile"])


class UserProfileResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    preferences: dict[str, Any]
    editable: bool = False


@router.get("/users", response_model=list[UserProfileResponse])
async def list_demo_users() -> list[UserProfileResponse]:
    """Lists available demo user profiles for the frontend user switcher."""
    try:
        from sqlalchemy import select
        from ecommerce_agent.db.models import User

        async with get_db_session() as session:
            stmt = select(User).order_by(User.id)
            res = await session.execute(stmt)
            users = res.scalars().all()
            if users:
                return [
                    UserProfileResponse(
                        id=u.id,
                        full_name=u.full_name,
                        email=u.email,
                        role=u.role,
                        preferences=u.preferences or {},
                        editable=False,
                    )
                    for u in users
                ]
    except Exception:
        pass

    # Fallback to seeded dictionary if DB is offline
    return [UserProfileResponse(**p) for p in DEFAULT_USER_PROFILES.values()]


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(request: Request) -> UserProfileResponse:
    """Retrieves profile and preference details for the currently active customer."""
    user_id = resolve_user_id_from_request(request)
    profile = await get_current_user_profile(user_id=user_id)
    return UserProfileResponse(**profile)
