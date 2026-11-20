"""Pydantic schemas for product discovery, searching, details, and comparison."""

from decimal import Decimal
from typing import Any
from pydantic import BaseModel, Field


class FilterCategory(BaseModel):
    id: int
    name: str
    parent_id: int | None = None


class PriceRange(BaseModel):
    min_price_inr: float = 0.0
    max_price_inr: float = 0.0


class AvailableFiltersResponse(BaseModel):
    categories: list[FilterCategory] = Field(default_factory=list)
    brands: list[str] = Field(default_factory=list)
    price_range: PriceRange = Field(default_factory=PriceRange)
    tags: list[str] = Field(default_factory=list)
    spec_keys: dict[str, Any] = Field(default_factory=dict, description="Discovered spec keys and valid values/ranges")
    feature_keys: dict[str, Any] = Field(default_factory=dict, description="Discovered feature keys and types")
    in_stock_count: int = 0


class ProductSummary(BaseModel):
    id: int
    sku: str
    name: str
    brand: str
    category_id: int
    category_name: str
    price_inr: float
    available_qty: int
    in_stock: bool
    average_rating: float | None = None
    review_count: int = 0
    key_specs: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)


class ProductSearchResult(BaseModel):
    products: list[ProductSummary] = Field(default_factory=list)
    total_count: int = 0
    limit: int = 10
    offset: int = 0
    has_more: bool = False


class ReviewSummary(BaseModel):
    id: int
    rating: int
    title: str
    body: str
    user_name: str | None = None
    created_at: str


class ProductDetail(BaseModel):
    id: int
    sku: str
    name: str
    brand: str
    category_id: int
    category_name: str
    description: str
    price_inr: float
    features: dict[str, Any] = Field(default_factory=dict)
    specs: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    active: bool = True
    stock_qty: int
    reserved_qty: int
    available_qty: int
    average_rating: float | None = None
    review_count: int = 0
    reviews: list[ReviewSummary] = Field(default_factory=list)


class ProductComparison(BaseModel):
    compared_products: list[dict[str, Any]] = Field(default_factory=list)
    specs_matrix: dict[str, dict[str, Any]] = Field(default_factory=dict)
    features_matrix: dict[str, dict[str, Any]] = Field(default_factory=dict)
    missing_specs_by_product: dict[str, list[str]] = Field(default_factory=dict)
    price_difference_summary: dict[str, Any] = Field(default_factory=dict)
