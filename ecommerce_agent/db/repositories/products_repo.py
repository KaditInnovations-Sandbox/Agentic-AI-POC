"""Product repository: discovery, dynamic filter introspection, JSONB search, and comparisons."""

from decimal import Decimal
from typing import Any
from sqlalchemy import (
    Float,
    Integer,
    Numeric,
    and_,
    cast,
    desc,
    func,
    or_,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ecommerce_agent.db.models import Category, Inventory, Product, Review, User
from ecommerce_agent.schemas.products import (
    AvailableFiltersResponse,
    FilterCategory,
    PriceRange,
    ProductComparison,
    ProductDetail,
    ProductSearchResult,
    ProductSummary,
    ReviewSummary,
)


async def _resolve_category_ids(
    session: AsyncSession,
    category_id: int | None = None,
    category_name: str | None = None,
) -> list[int]:
    """Resolves a category and all its descendant subcategory IDs."""
    if category_id is None and not category_name:
        return []

    # Find the target category
    query = select(Category)
    if category_id is not None:
        query = query.where(Category.id == category_id)
    elif category_name:
        query = query.where(func.lower(Category.name) == category_name.strip().lower())

    res = await session.execute(query)
    target = res.scalars().first()
    if not target:
        return []

    # Fetch all categories to compute descendants in Python
    all_cats_res = await session.execute(select(Category.id, Category.parent_id))
    all_cats = all_cats_res.all()

    # Build parent -> children map
    children_map: dict[int, list[int]] = {}
    for cid, pid in all_cats:
        if pid is not None:
            children_map.setdefault(pid, []).append(cid)

    # Collect target and descendants
    result_ids = [target.id]
    queue = [target.id]
    while queue:
        curr = queue.pop(0)
        for child_id in children_map.get(curr, []):
            result_ids.append(child_id)
            queue.append(child_id)

    return result_ids


async def get_available_filters(
    session: AsyncSession,
    category_id: int | None = None,
    category_name: str | None = None,
) -> AvailableFiltersResponse:
    """Dynamically introspects categories, brands, price ranges, tags, and JSONB keys/values."""
    # 1. Categories
    cat_query = select(Category.id, Category.name, Category.parent_id).order_by(Category.name)
    cat_res = await session.execute(cat_query)
    categories = [
        FilterCategory(id=r[0], name=r[1], parent_id=r[2])
        for r in cat_res.all()
    ]

    # Resolve category filter if specified
    cat_ids = await _resolve_category_ids(session, category_id, category_name)

    # Base query for active products matching category scope
    base_prod_query = select(Product).where(Product.active.is_(True))
    if cat_ids:
        base_prod_query = base_prod_query.where(Product.category_id.in_(cat_ids))

    base_prod_query = base_prod_query.options(selectinload(Product.inventory))
    prod_res = await session.execute(base_prod_query)
    products = prod_res.scalars().all()

    if not products:
        return AvailableFiltersResponse(
            categories=categories,
            brands=[],
            price_range=PriceRange(min_price_inr=0.0, max_price_inr=0.0),
            tags=[],
            spec_keys={},
            feature_keys={},
            in_stock_count=0,
        )

    # 2. Brands
    brands = sorted(list({p.brand for p in products if p.brand}))

    # 3. Price Range
    prices = [float(p.price_inr) for p in products]
    min_price = min(prices) if prices else 0.0
    max_price = max(prices) if prices else 0.0

    # 4. Tags
    all_tags = set()
    for p in products:
        if p.tags:
            all_tags.update(p.tags)
    tags = sorted(list(all_tags))

    # 5. In-stock count
    in_stock_count = 0
    for p in products:
        if p.inventory and p.inventory.available_qty > 0:
            in_stock_count += 1

    # 6. JSONB specs introspection
    spec_aggregates: dict[str, Any] = {}
    for p in products:
        if p.specs and isinstance(p.specs, dict):
            for k, v in p.specs.items():
                if k not in spec_aggregates:
                    spec_aggregates[k] = {"values": set(), "is_numeric": True, "min": None, "max": None}
                
                if isinstance(v, (int, float)):
                    if spec_aggregates[k]["min"] is None or v < spec_aggregates[k]["min"]:
                        spec_aggregates[k]["min"] = v
                    if spec_aggregates[k]["max"] is None or v > spec_aggregates[k]["max"]:
                        spec_aggregates[k]["max"] = v
                else:
                    spec_aggregates[k]["is_numeric"] = False
                
                spec_aggregates[k]["values"].add(str(v))

    spec_keys_summary: dict[str, Any] = {}
    for k, info in spec_aggregates.items():
        if info["is_numeric"] and info["min"] is not None and info["max"] is not None:
            spec_keys_summary[k] = {
                "type": "numeric_range",
                "min": info["min"],
                "max": info["max"],
                "valid_values": sorted(list(info["values"]), key=lambda x: float(x) if x.replace('.', '', 1).isdigit() else x),
            }
        else:
            spec_keys_summary[k] = {
                "type": "discrete_values",
                "valid_values": sorted(list(info["values"])),
            }

    # 7. JSONB features introspection
    feature_aggregates: dict[str, Any] = {}
    for p in products:
        if p.features and isinstance(p.features, dict):
            for k, v in p.features.items():
                if k not in feature_aggregates:
                    feature_aggregates[k] = {"values": set(), "type": type(v).__name__}
                feature_aggregates[k]["values"].add(v)

    feature_keys_summary: dict[str, Any] = {}
    for k, info in feature_aggregates.items():
        feature_keys_summary[k] = {
            "type": info["type"],
            "distinct_values": sorted(list(info["values"])),
        }

    return AvailableFiltersResponse(
        categories=categories,
        brands=brands,
        price_range=PriceRange(min_price_inr=min_price, max_price_inr=max_price),
        tags=tags,
        spec_keys=spec_keys_summary,
        feature_keys=feature_keys_summary,
        in_stock_count=in_stock_count,
    )


async def search_products(
    session: AsyncSession,
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
) -> ProductSearchResult:
    """Searches products with rich, validated criteria and SQL parameterized queries."""
    # Subquery for review ratings
    rating_subquery = (
        select(
            Review.product_id,
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("review_count"),
        )
        .group_by(Review.product_id)
        .subquery()
    )

    # Base query
    stmt = (
        select(
            Product,
            Category.name.label("category_name"),
            Inventory.stock_qty,
            Inventory.reserved_qty,
            rating_subquery.c.avg_rating,
            rating_subquery.c.review_count,
        )
        .join(Category, Product.category_id == Category.id)
        .outerjoin(Inventory, Product.id == Inventory.product_id)
        .outerjoin(rating_subquery, Product.id == rating_subquery.c.product_id)
        .where(Product.active.is_(True))
    )

    # 1. Keyword search (name, description, brand, tags)
    if query and query.strip():
        q_term = f"%{query.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.name).like(q_term),
                func.lower(Product.description).like(q_term),
                func.lower(Product.brand).like(q_term),
                func.lower(Category.name).like(q_term),
            )
        )

    # 2. Category filter
    cat_ids = await _resolve_category_ids(session, category_id, category_name)
    if cat_ids:
        stmt = stmt.where(Product.category_id.in_(cat_ids))

    # 3. Brand filter
    if brand and brand.strip():
        stmt = stmt.where(func.lower(Product.brand) == brand.strip().lower())

    # 4. Price range
    if min_price is not None:
        stmt = stmt.where(Product.price_inr >= Decimal(str(min_price)))
    if max_price is not None:
        stmt = stmt.where(Product.price_inr <= Decimal(str(max_price)))

    # 5. In-stock filter
    if in_stock_only:
        stmt = stmt.where(
            and_(
                Inventory.stock_qty.isnot(None),
                (Inventory.stock_qty - func.coalesce(Inventory.reserved_qty, 0)) > 0,
            )
        )

    # 6. Tags filter
    if tags:
        # Check if product contains any of the required tags
        for tag in tags:
            stmt = stmt.where(Product.tags.any(tag.strip().lower()))

    # 7. Rating filter
    if min_rating is not None:
        stmt = stmt.where(
            and_(
                rating_subquery.c.avg_rating.isnot(None),
                rating_subquery.c.avg_rating >= min_rating,
            )
        )

    # 8. Specs JSONB matching
    if specs and isinstance(specs, dict):
        for spec_key, spec_val in specs.items():
            if isinstance(spec_val, (int, float)):
                # Numeric comparison
                stmt = stmt.where(
                    cast(func.jsonb_extract_path_text(Product.specs, spec_key), Float) >= float(spec_val)
                )
            elif isinstance(spec_val, dict):
                # Range dict e.g. {"min": 16, "max": 32}
                if "min" in spec_val:
                    stmt = stmt.where(
                        cast(func.jsonb_extract_path_text(Product.specs, spec_key), Float) >= float(spec_val["min"])
                    )
                if "max" in spec_val:
                    stmt = stmt.where(
                        cast(func.jsonb_extract_path_text(Product.specs, spec_key), Float) <= float(spec_val["max"])
                    )
            else:
                # Exact or string match
                stmt = stmt.where(
                    func.lower(func.jsonb_extract_path_text(Product.specs, spec_key)) == str(spec_val).strip().lower()
                )

    # 9. Features JSONB matching
    if features and isinstance(features, dict):
        for feat_key, feat_val in features.items():
            if isinstance(feat_val, bool):
                # PostgreSQL boolean in JSONB
                val_str = "true" if feat_val else "false"
                stmt = stmt.where(
                    func.lower(func.jsonb_extract_path_text(Product.features, feat_key)) == val_str
                )
            elif isinstance(feat_val, (int, float)):
                stmt = stmt.where(
                    cast(func.jsonb_extract_path_text(Product.features, feat_key), Float) >= float(feat_val)
                )
            else:
                stmt = stmt.where(
                    func.lower(func.jsonb_extract_path_text(Product.features, feat_key)) == str(feat_val).strip().lower()
                )

    # Count total matching products
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count_res = await session.execute(count_stmt)
    total_count = total_count_res.scalar_one_or_none() or 0

    # 10. Sorting
    if sort_by == "price_asc":
        stmt = stmt.order_by(Product.price_inr.asc())
    elif sort_by == "price_desc":
        stmt = stmt.order_by(Product.price_inr.desc())
    elif sort_by == "rating_desc":
        stmt = stmt.order_by(desc(rating_subquery.c.avg_rating).nulls_last())
    elif sort_by == "name_asc":
        stmt = stmt.order_by(Product.name.asc())
    else:
        # Default relevance / id
        stmt = stmt.order_by(Product.id.asc())

    # Pagination
    stmt = stmt.limit(limit).offset(offset)
    res = await session.execute(stmt)
    rows = res.all()

    product_summaries: list[ProductSummary] = []
    for row in rows:
        prod: Product = row[0]
        cat_name: str = row[1]
        stock_qty: int = row[2] or 0
        reserved_qty: int = row[3] or 0
        avg_rating: float | None = float(row[4]) if row[4] is not None else None
        rev_count: int = row[5] or 0

        avail_qty = max(0, stock_qty - reserved_qty)
        key_specs = {k: v for k, v in (prod.specs or {}).items() if k in ["ram_gb", "storage_gb", "processor", "type"]}

        product_summaries.append(
            ProductSummary(
                id=prod.id,
                sku=prod.sku,
                name=prod.name,
                brand=prod.brand,
                category_id=prod.category_id,
                category_name=cat_name,
                price_inr=float(prod.price_inr),
                available_qty=avail_qty,
                in_stock=avail_qty > 0,
                average_rating=round(avg_rating, 1) if avg_rating is not None else None,
                review_count=rev_count,
                key_specs=key_specs,
                tags=prod.tags or [],
            )
        )

    return ProductSearchResult(
        products=product_summaries,
        total_count=total_count,
        limit=limit,
        offset=offset,
        has_more=(offset + len(product_summaries)) < total_count,
    )


async def get_product_details(
    session: AsyncSession,
    product_id: int,
) -> ProductDetail | None:
    """Retrieves verified product details, specifications, features, inventory, and reviews."""
    stmt = (
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.category),
            selectinload(Product.inventory),
            selectinload(Product.reviews).selectinload(Review.user),
        )
    )
    res = await session.execute(stmt)
    product = res.scalars().first()
    if not product:
        return None

    # Calculate inventory
    stock_qty = product.inventory.stock_qty if product.inventory else 0
    reserved_qty = product.inventory.reserved_qty if product.inventory else 0
    available_qty = max(0, stock_qty - reserved_qty)

    # Reviews breakdown
    review_summaries: list[ReviewSummary] = []
    ratings: list[int] = []
    for r in product.reviews:
        ratings.append(r.rating)
        user_name = r.user.full_name if r.user else "Anonymous"
        review_summaries.append(
            ReviewSummary(
                id=r.id,
                rating=r.rating,
                title=r.title,
                body=r.body,
                user_name=user_name,
                created_at=r.created_at.strftime("%Y-%m-%d"),
            )
        )

    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

    return ProductDetail(
        id=product.id,
        sku=product.sku,
        name=product.name,
        brand=product.brand,
        category_id=product.category_id,
        category_name=product.category.name if product.category else "Uncategorized",
        description=product.description,
        price_inr=float(product.price_inr),
        features=product.features or {},
        specs=product.specs or {},
        tags=product.tags or [],
        active=product.active,
        stock_qty=stock_qty,
        reserved_qty=reserved_qty,
        available_qty=available_qty,
        average_rating=avg_rating,
        review_count=len(ratings),
        reviews=review_summaries,
    )


async def compare_products(
    session: AsyncSession,
    product_ids: list[int],
) -> ProductComparison | dict[str, str]:
    """Compares 2 to 4 products side by side and highlights missing specifications."""
    if len(product_ids) < 2 or len(product_ids) > 4:
        return {"error": "Comparison requires between 2 and 4 product IDs."}

    # Fetch products
    stmt = (
        select(Product)
        .where(Product.id.in_(product_ids))
        .options(
            selectinload(Product.inventory),
            selectinload(Product.reviews),
        )
    )
    res = await session.execute(stmt)
    products = res.scalars().all()

    if len(products) < len(product_ids):
        found_ids = {p.id for p in products}
        missing_ids = set(product_ids) - found_ids
        return {"error": f"The following product IDs were not found: {sorted(list(missing_ids))}"}

    # Gather all spec and feature keys across all compared products
    all_spec_keys = set()
    all_feature_keys = set()
    for p in products:
        all_spec_keys.update((p.specs or {}).keys())
        all_feature_keys.update((p.features or {}).keys())

    specs_matrix: dict[str, dict[str, Any]] = {k: {} for k in sorted(all_spec_keys)}
    features_matrix: dict[str, dict[str, Any]] = {k: {} for k in sorted(all_feature_keys)}
    missing_specs_by_product: dict[str, list[str]] = {}
    compared_products: list[dict[str, Any]] = []

    for p in products:
        p_name = f"{p.name} (ID: {p.id})"
        missing_for_p: list[str] = []

        # Inventory & Rating
        avail_qty = p.inventory.available_qty if p.inventory else 0
        ratings = [r.rating for r in p.reviews]
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

        compared_products.append({
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "brand": p.brand,
            "price_inr": float(p.price_inr),
            "available_qty": avail_qty,
            "in_stock": avail_qty > 0,
            "average_rating": avg_rating,
        })

        # Fill specs
        for k in all_spec_keys:
            val = (p.specs or {}).get(k)
            specs_matrix[k][p_name] = val
            if val is None:
                missing_for_p.append(k)

        # Fill features
        for k in all_feature_keys:
            val = (p.features or {}).get(k)
            features_matrix[k][p_name] = val

        missing_specs_by_product[p_name] = missing_for_p

    # Price differences
    prices = [float(p.price_inr) for p in products]
    min_price_prod = min(products, key=lambda p: p.price_inr)
    max_price_prod = max(products, key=lambda p: p.price_inr)
    price_diff_summary = {
        "lowest_price": {"product": min_price_prod.name, "price_inr": float(min_price_prod.price_inr)},
        "highest_price": {"product": max_price_prod.name, "price_inr": float(max_price_prod.price_inr)},
        "price_difference_inr": float(max_price_prod.price_inr - min_price_prod.price_inr),
    }

    return ProductComparison(
        compared_products=compared_products,
        specs_matrix=specs_matrix,
        features_matrix=features_matrix,
        missing_specs_by_product=missing_specs_by_product,
        price_difference_summary=price_diff_summary,
    )
