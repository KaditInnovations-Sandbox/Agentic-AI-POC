"""REST API endpoints for product discovery, search, filtering, and details."""

from typing import Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ecommerce_agent.db.connection import get_db_session
from ecommerce_agent.db.repositories.products_repo import (
    get_available_filters as repo_get_filters,
    get_product_details as repo_get_product_details,
    search_products as repo_search_products,
)
from ecommerce_agent.schemas.products import (
    AvailableFiltersResponse,
    ProductDetail,
    ProductSummary,
)

router = APIRouter(prefix="/api/products", tags=["Products"])


class PaginatedProductsResponse(BaseModel):
    items: list[ProductSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("", response_model=PaginatedProductsResponse)
async def list_products(
    q: str | None = Query(None, description="Search query across product name, brand, description, and tags"),
    category_id: int | None = Query(None, description="Category filter"),
    brand: str | None = Query(None, description="Brand filter"),
    min_price: float | None = Query(None, ge=0, description="Minimum price filter"),
    max_price: float | None = Query(None, ge=0, description="Maximum price filter"),
    in_stock_only: bool = Query(False, description="Filter only in-stock items"),
    tag: str | None = Query(None, description="Specific tag filter (e.g. laptop, premium, wireless)"),
    sort_by: str = Query("relevance", description="Sort order: relevance, price_asc, price_desc, rating_desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(12, ge=1, le=100, description="Items per page"),
) -> PaginatedProductsResponse:
    """Lists products with full-text search, multi-faceted filtering, and server-side pagination."""
    offset = (page - 1) * page_size
    tags_list = [tag] if tag else None

    async with get_db_session() as session:
        result = await repo_search_products(
            session=session,
            query=q,
            category_id=category_id,
            brand=brand,
            min_price=min_price,
            max_price=max_price,
            in_stock_only=in_stock_only,
            tags=tags_list,
            sort_by=sort_by,
            limit=page_size,
            offset=offset,
        )

        total_pages = (result.total_count + page_size - 1) // page_size if result.total_count > 0 else 0

        return PaginatedProductsResponse(
            items=result.products,
            total=result.total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )


@router.get("/filters", response_model=AvailableFiltersResponse)
async def get_filters(
    category_id: int | None = Query(None, description="Optional category to narrow filters"),
) -> AvailableFiltersResponse:
    """Retrieves dynamic faceted filters (categories, brands, price bounds, and tags)."""
    async with get_db_session() as session:
        return await repo_get_filters(session=session, category_id=category_id)


@router.get("/{product_id}", response_model=ProductDetail)
async def get_product(product_id: int) -> ProductDetail:
    """Retrieves full product details including technical specifications, inventory, and reviews."""
    async with get_db_session() as session:
        detail = await repo_get_product_details(session=session, product_id=product_id)
        if not detail:
            raise HTTPException(status_code=404, detail=f"Product with ID {product_id} not found.")
        return detail
