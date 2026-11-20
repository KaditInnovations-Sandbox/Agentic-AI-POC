"""REST API endpoints for shopping cart inspection and mutations."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ecommerce_agent.db.connection import get_db_session
from ecommerce_agent.db.repositories.cart_repo import (
    add_to_cart as repo_add_to_cart,
    get_cart as repo_get_cart,
    remove_cart_item as repo_remove_cart_item,
    update_cart_item as repo_update_cart_item,
)
from ecommerce_agent.schemas.cart import CartActionResponse, CartResponse
from ecommerce_agent.services.auth import resolve_user_id_from_request

router = APIRouter(prefix="/api/cart", tags=["Cart"])


class AddCartItemRequest(BaseModel):
    product_id: int = Field(..., gt=0, description="Product ID to add")
    quantity: int = Field(1, gt=0, description="Quantity to add")


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(..., ge=0, description="New quantity (0 to remove)")


@router.get("", response_model=CartResponse)
async def get_cart(request: Request) -> CartResponse:
    """Retrieves the customer's active shopping cart, line items, and subtotal."""
    user_id = resolve_user_id_from_request(request)
    async with get_db_session() as session:
        return await repo_get_cart(session=session, user_id=user_id)


@router.post("/items", response_model=CartActionResponse)
async def add_item(req: AddCartItemRequest, request: Request) -> CartActionResponse:
    """Adds a product to the customer's cart, validating real-time inventory."""
    user_id = resolve_user_id_from_request(request)
    async with get_db_session() as session:
        result = await repo_add_to_cart(
            session=session,
            user_id=user_id,
            product_id=req.product_id,
            quantity=req.quantity,
        )
        if result.status != "success":
            raise HTTPException(status_code=400, detail=result.message)
        return result


@router.patch("/items/{product_id}", response_model=CartActionResponse)
async def update_item(
    product_id: int,
    req: UpdateCartItemRequest,
    request: Request,
) -> CartActionResponse:
    """Updates the quantity of a cart item (or removes it if quantity is 0)."""
    user_id = resolve_user_id_from_request(request)
    async with get_db_session() as session:
        result = await repo_update_cart_item(
            session=session,
            user_id=user_id,
            product_id=product_id,
            quantity=req.quantity,
        )
        if result.status != "success":
            raise HTTPException(status_code=400, detail=result.message)
        return result


@router.delete("/items/{product_id}", response_model=CartActionResponse)
async def remove_item(product_id: int, request: Request) -> CartActionResponse:
    """Removes an item completely from the customer's cart."""
    user_id = resolve_user_id_from_request(request)
    async with get_db_session() as session:
        result = await repo_remove_cart_item(
            session=session,
            user_id=user_id,
            product_id=product_id,
        )
        if result.status != "success":
            raise HTTPException(status_code=400, detail=result.message)
        return result
