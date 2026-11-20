"""Pydantic schemas for shopping cart operations."""

from pydantic import BaseModel, Field


class CartItemDetail(BaseModel):
    product_id: int
    sku: str
    name: str
    brand: str
    unit_price_inr: float
    quantity: int
    line_total_inr: float
    available_qty: int
    in_stock: bool


class CartResponse(BaseModel):
    user_id: int
    cart_id: int | None = None
    items: list[CartItemDetail] = Field(default_factory=list)
    total_items: int = 0
    cart_total_inr: float = 0.0


class CartActionResponse(BaseModel):
    status: str
    message: str
    cart: CartResponse | None = None
