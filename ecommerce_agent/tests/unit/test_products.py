"""Unit tests for product discovery, search, details, and comparison tools."""

import asyncio
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest

from ecommerce_agent.schemas.products import (
    AvailableFiltersResponse,
    FilterCategory,
    PriceRange,
    ProductComparison,
    ProductDetail,
    ProductSearchResult,
    ProductSummary,
)
from ecommerce_agent.tools import products as product_tools


def test_get_available_filters_success(sample_categories):
    """Test dynamic discovery of categories, brands, price ranges, and specs."""
    mock_filters = AvailableFiltersResponse(
        categories=[FilterCategory(id=c.id, name=c.name, parent_id=c.parent_id) for c in sample_categories],
        brands=["Acer", "Dell", "Lenovo"],
        price_range=PriceRange(min_price_inr=38990.0, max_price_inr=54990.0),
        tags=["laptop", "office", "student", "budget"],
        spec_keys={
            "ram_gb": {"type": "numeric_range", "min": 8, "max": 16, "valid_values": [8, 16]},
            "processor": {"type": "discrete_values", "valid_values": ["Core i5", "Ryzen 3", "Ryzen 5"]},
        },
        feature_keys={
            "backlit_keyboard": {"type": "bool", "distinct_values": [False, True]},
        },
        in_stock_count=2,
    )

    with patch("ecommerce_agent.db.repositories.products_repo.get_available_filters", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_filters

        res = asyncio.run(product_tools.get_available_filters(category_id=3))
        assert res["status"] == "success"
        data = res["data"]
        assert len(data["categories"]) == 4
        assert "Dell" in data["brands"]
        assert data["price_range"]["min_price_inr"] == 38990.0
        assert data["price_range"]["max_price_inr"] == 54990.0
        assert data["in_stock_count"] == 2
        assert "ram_gb" in data["spec_keys"]


def test_search_products_combined_filters():
    """Test searching with keyword, category, brand, price, and specs."""
    mock_results = ProductSearchResult(
        products=[
            ProductSummary(
                id=101,
                sku="LAP-DEL-101",
                name="Dell Inspiron 14 Demo",
                brand="Dell",
                category_id=3,
                category_name="Laptops",
                price_inr=54990.0,
                available_qty=8,
                in_stock=True,
                average_rating=5.0,
                review_count=1,
                key_specs={"ram_gb": 16, "processor": "Core i5"},
                tags=["laptop", "office"],
            )
        ],
        total_count=1,
        limit=10,
        offset=0,
        has_more=False,
    )

    with patch("ecommerce_agent.db.repositories.products_repo.search_products", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_results

        res = asyncio.run(
            product_tools.search_products(
                query="Inspiron",
                brand="Dell",
                min_price=50000,
                max_price=60000,
                in_stock_only=True,
                specs={"ram_gb": 16},
            )
        )
        assert res["status"] == "success"
        prods = res["data"]["products"]
        assert len(prods) == 1
        assert prods[0]["id"] == 101
        assert prods[0]["brand"] == "Dell"
        assert prods[0]["available_qty"] == 8


def test_search_products_empty_results():
    """Test search with no matching products."""
    mock_results = ProductSearchResult(products=[], total_count=0, limit=10, offset=0, has_more=False)

    with patch("ecommerce_agent.db.repositories.products_repo.search_products", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_results

        res = asyncio.run(product_tools.search_products(brand="NonExistentBrand"))
        assert res["status"] == "success"
        assert len(res["data"]["products"]) == 0
        assert res["data"]["total_count"] == 0


def test_get_product_details_success():
    """Test retrieving verified product details and reviews."""
    mock_detail = ProductDetail(
        id=101,
        sku="LAP-DEL-101",
        name="Dell Inspiron 14 Demo",
        brand="Dell",
        category_id=3,
        category_name="Laptops",
        description="14-inch everyday productivity laptop",
        price_inr=54990.0,
        features={"battery_hours_claimed": 9, "backlit_keyboard": True},
        specs={"ram_gb": 16, "storage_gb": 512, "processor": "Core i5", "weight_kg": 1.55},
        tags=["laptop", "office", "lightweight"],
        active=True,
        stock_qty=8,
        reserved_qty=0,
        available_qty=8,
        average_rating=5.0,
        review_count=1,
        reviews=[
            {
                "id": 1,
                "rating": 5,
                "title": "Great office laptop",
                "body": "Good performance.",
                "user_name": "Asha Kumar",
                "created_at": "2026-10-10",
            }
        ],
    )

    with patch("ecommerce_agent.db.repositories.products_repo.get_product_details", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_detail

        res = asyncio.run(product_tools.get_product_details(product_id=101))
        assert res["status"] == "success"
        data = res["data"]
        assert data["id"] == 101
        assert data["sku"] == "LAP-DEL-101"
        assert data["available_qty"] == 8
        assert data["average_rating"] == 5.0
        assert len(data["reviews"]) == 1


def test_get_product_details_not_found():
    """Test retrieving non-existent product details."""
    with patch("ecommerce_agent.db.repositories.products_repo.get_product_details", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = None

        res = asyncio.run(product_tools.get_product_details(product_id=9999))
        assert res["status"] == "error"
        assert "not found" in res["message"]


def test_compare_products_success():
    """Test comparing 2 products and highlighting missing specs."""
    mock_comparison = ProductComparison(
        compared_products=[
            {"id": 101, "name": "Dell Inspiron 14 Demo", "brand": "Dell", "price_inr": 54990.0, "available_qty": 8},
            {"id": 102, "name": "Lenovo IdeaPad Slim 3 Demo", "brand": "Lenovo", "price_inr": 49990.0, "available_qty": 15},
        ],
        specs_matrix={
            "ram_gb": {"Dell Inspiron 14 Demo (ID: 101)": 16, "Lenovo IdeaPad Slim 3 Demo (ID: 102)": 16},
            "weight_kg": {"Dell Inspiron 14 Demo (ID: 101)": 1.55, "Lenovo IdeaPad Slim 3 Demo (ID: 102)": 1.62},
        },
        features_matrix={
            "backlit_keyboard": {"Dell Inspiron 14 Demo (ID: 101)": True, "Lenovo IdeaPad Slim 3 Demo (ID: 102)": False},
        },
        missing_specs_by_product={
            "Dell Inspiron 14 Demo (ID: 101)": [],
            "Lenovo IdeaPad Slim 3 Demo (ID: 102)": [],
        },
        price_difference_summary={
            "lowest_price": {"product": "Lenovo IdeaPad Slim 3 Demo", "price_inr": 49990.0},
            "highest_price": {"product": "Dell Inspiron 14 Demo", "price_inr": 54990.0},
            "price_difference_inr": 5000.0,
        },
    )

    with patch("ecommerce_agent.db.repositories.products_repo.compare_products", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = mock_comparison

        res = asyncio.run(product_tools.compare_products(product_ids=[101, 102]))
        assert res["status"] == "success"
        data = res["data"]
        assert len(data["compared_products"]) == 2
        assert data["price_difference_summary"]["price_difference_inr"] == 5000.0


def test_compare_products_invalid_count():
    """Test comparison tool rejection when < 2 or > 4 products provided."""
    with patch("ecommerce_agent.db.repositories.products_repo.compare_products", new_callable=AsyncMock) as mock_repo:
        mock_repo.return_value = {"error": "Comparison requires between 2 and 4 product IDs."}

        # Test single product
        res_single = asyncio.run(product_tools.compare_products(product_ids=[101]))
        assert res_single["status"] == "error"

        # Test 5 products
        res_many = asyncio.run(product_tools.compare_products(product_ids=[101, 102, 103, 104, 105]))
        assert res_many["status"] == "error"
