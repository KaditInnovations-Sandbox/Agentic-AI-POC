"""REST API endpoints for customer order history, details, and cancellation."""

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from ecommerce_agent.db.connection import get_db_session
from ecommerce_agent.db.repositories.orders_repo import (
    check_order_cancellation_eligibility,
    get_order_details as repo_get_order_details,
    get_order_history as repo_get_order_history,
)
from ecommerce_agent.schemas.orders import (
    OrderCancellationEligibility,
    OrderDetail,
    OrderSummary,
)
from ecommerce_agent.services.auth import resolve_user_id_from_request

router = APIRouter(prefix="/api/orders", tags=["Orders"])


class OrderDetailWithEligibility(BaseModel):
    order: OrderDetail
    cancellation_eligibility: OrderCancellationEligibility


@router.get("", response_model=list[OrderSummary])
async def list_orders(
    request: Request,
    limit: int = Query(20, ge=1, le=100, description="Maximum number of orders to return"),
) -> list[OrderSummary]:
    """Retrieves past orders for the authenticated customer, sorted newest first."""
    user_id = resolve_user_id_from_request(request)
    async with get_db_session() as session:
        return await repo_get_order_history(session=session, user_id=user_id, limit=limit)


@router.get("/{order_id}", response_model=OrderDetailWithEligibility)
async def get_order(
    order_id: int,
    request: Request,
) -> OrderDetailWithEligibility:
    """Retrieves full details for a specific order, enforcing customer ownership and cancellation eligibility."""
    user_id = resolve_user_id_from_request(request)
    async with get_db_session() as session:
        detail = await repo_get_order_details(session=session, user_id=user_id, order_id=order_id)
        if not detail:
            raise HTTPException(
                status_code=404,
                detail=f"Order {order_id} not found or does not belong to customer #{user_id}.",
            )

        eligibility = await check_order_cancellation_eligibility(
            session=session,
            user_id=user_id,
            order_id=order_id,
        )

        return OrderDetailWithEligibility(
            order=detail,
            cancellation_eligibility=eligibility,
        )
