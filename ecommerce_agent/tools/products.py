"""ADK Product Discovery Tools for Shopity."""

from typing import Any
from ecommerce_agent.db.connection import get_db_session
from ecommerce_agent.db.repositories import products_repo


async def get_available_filters(
    category_id: int | None = None,
    category_name: str | None = None,
) -> dict:
    """Discovers available categories, brands, price ranges, tags, and specification attributes.

    Use this tool to find valid filter criteria before or alongside searching for products.
    Filters are derived dynamically from PostgreSQL.

    Args:
        category_id: Optional ID of a category to scope discovery (e.g., 3 for Laptops).
        category_name: Optional name of a category to scope discovery (e.g., 'Laptops' or 'Audio').

    Returns:
        dict: Available categories, brands, price range, tags, specs, and feature keys.
    """
    try:
        async with get_db_session() as session:
            filters = await products_repo.get_available_filters(
                session, category_id=category_id, category_name=category_name
            )
            return {"status": "success", "data": filters.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Failed to discover filters: {str(e)}"}


async def search_products(
    query: str | None = None,
    category_id: int | None = None,
    category_name: str | None = None,
    brand: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    in_stock_only: bool = False,
    tags: list[str] | None = None,
    min_rating: float | None = None,
    specs: dict[str, Any] | None = None,
    features: dict[str, Any] | None = None,
    sort_by: str = "relevance",
    limit: int = 10,
    offset: int = 0,
) -> dict:
    """Searches the product catalog using structured filters, keywords, and JSONB specifications.

    Args:
        query: Optional free-text keywords to match name, description, brand, or tags.
        category_id: Optional category ID filter.
        category_name: Optional category name filter (e.g., 'Laptops').
        brand: Optional brand name (e.g., 'Dell', 'Lenovo', 'Sony').
        min_price: Minimum price in INR.
        max_price: Maximum price in INR.
        in_stock_only: If True, returns only products with available stock (> 0).
        tags: List of tags to match (e.g., ['laptop', 'office']).
        min_rating: Minimum average customer review rating (1.0 to 5.0).
        specs: JSON specification criteria (e.g., {'ram_gb': 16} or {'ram_gb': {'min': 16}}).
        features: JSON feature criteria (e.g., {'backlit_keyboard': True}).
        sort_by: Sort ordering ('relevance', 'price_asc', 'price_desc', 'rating_desc', 'name_asc').
        limit: Number of items to return (default 10).
        offset: Pagination offset (default 0).

    Returns:
        dict: Matching products with available stock, pricing, and ratings.
    """
    try:
        async with get_db_session() as session:
            result = await products_repo.search_products(
                session=session,
                query=query,
                category_id=category_id,
                category_name=category_name,
                brand=brand,
                min_price=min_price,
                max_price=max_price,
                in_stock_only=in_stock_only,
                tags=tags,
                min_rating=min_rating,
                specs=specs,
                features=features,
                sort_by=sort_by,
                limit=limit,
                offset=offset,
            )
            return {"status": "success", "data": result.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Search failed: {str(e)}"}


async def get_product_details(product_id: int) -> dict:
    """Retrieves verified specifications, inventory, pricing, and reviews for a single product.

    Args:
        product_id: The unique product identifier.

    Returns:
        dict: Verified product details, specifications, features, available inventory, and customer reviews.
    """
    try:
        async with get_db_session() as session:
            detail = await products_repo.get_product_details(session, product_id=product_id)
            if not detail:
                return {
                    "status": "error",
                    "message": f"Product with ID {product_id} was not found.",
                }
            return {"status": "success", "data": detail.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Failed to retrieve product details: {str(e)}"}


async def compare_products(product_ids: list[int]) -> dict:
    """Compares 2 to 4 products side by side, identifying specifications and missing attributes.

    Args:
        product_ids: List of 2 to 4 product IDs to compare.

    Returns:
        dict: Side-by-side comparison matrix, price difference, and missing attributes breakdown.
    """
    try:
        async with get_db_session() as session:
            result = await products_repo.compare_products(session, product_ids=product_ids)
            if isinstance(result, dict) and "error" in result:
                return {"status": "error", "message": result["error"]}
            return {"status": "success", "data": result.model_dump()}
    except Exception as e:
        return {"status": "error", "message": f"Comparison failed: {str(e)}"}
