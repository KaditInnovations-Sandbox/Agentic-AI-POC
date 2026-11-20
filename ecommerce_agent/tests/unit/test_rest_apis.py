"""Unit and integration tests for new REST API endpoints."""

import asyncio
import httpx
import pytest
from ecommerce_agent.server import app


def test_products_api():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
            # 1. List with pagination
            res = await c.get("/api/products?page=1&page_size=5")
            assert res.status_code == 200
            data = res.json()
            assert "items" in data
            assert data["total"] > 0
            assert len(data["items"]) <= 5
            assert data["page"] == 1
            assert data["total_pages"] >= 1

            # 2. Search query
            res_q = await c.get("/api/products?q=Dell")
            assert res_q.status_code == 200
            for item in res_q.json()["items"]:
                assert "dell" in item["brand"].lower() or "dell" in item["name"].lower()

            # 3. Filters endpoint
            res_f = await c.get("/api/products/filters")
            assert res_f.status_code == 200
            filters = res_f.json()
            assert "categories" in filters
            assert "brands" in filters
            assert "price_range" in filters

            # 4. Product details
            first_id = data["items"][0]["id"]
            res_d = await c.get(f"/api/products/{first_id}")
            assert res_d.status_code == 200
            detail = res_d.json()
            assert detail["id"] == first_id
            assert "specs" in detail
            assert "features" in detail

            # 5. Non-existent product
            res_404 = await c.get("/api/products/999999")
            assert res_404.status_code == 404

    asyncio.run(run())


def test_cart_api():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
            headers = {"x-user-id": "3"}

            # 1. Get initial cart
            res = await c.get("/api/cart", headers=headers)
            assert res.status_code == 200

            # 2. Add product 102
            add_res = await c.post("/api/cart/items", json={"product_id": 102, "quantity": 1}, headers=headers)
            assert add_res.status_code == 200
            assert add_res.json()["status"] == "success"

            # 3. Update quantity
            up_res = await c.patch("/api/cart/items/102", json={"quantity": 2}, headers=headers)
            assert up_res.status_code == 200
            assert up_res.json()["status"] == "success"

            # 4. Remove item
            del_res = await c.delete("/api/cart/items/102", headers=headers)
            assert del_res.status_code == 200
            assert del_res.json()["status"] == "success"

    asyncio.run(run())


def test_orders_and_users_api():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
            headers = {"x-user-id": "1"}

            # 1. List demo users
            res_u = await c.get("/api/users")
            assert res_u.status_code == 200
            users = res_u.json()
            assert len(users) >= 3
            assert any(u["full_name"] == "Asha Kumar" for u in users)

            # 2. Profile for user 1
            res_p = await c.get("/api/profile", headers=headers)
            assert res_p.status_code == 200
            assert res_p.json()["full_name"] == "Asha Kumar"

            # 3. Orders list for user 1
            res_o = await c.get("/api/orders", headers=headers)
            assert res_o.status_code == 200
            orders = res_o.json()
            assert len(orders) > 0

            # 4. Specific order details
            first_order_id = orders[0]["id"]
            res_od = await c.get(f"/api/orders/{first_order_id}", headers=headers)
            assert res_od.status_code == 200
            order_data = res_od.json()
            assert "order" in order_data
            assert "cancellation_eligibility" in order_data

    asyncio.run(run())


def test_conversations_api():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
            headers = {"x-user-id": "1"}

            # 1. Create a conversation session
            create_res = await c.post("/api/conversations", json={}, headers=headers)
            assert create_res.status_code == 200
            session_id = create_res.json()["id"]

            # 2. List conversations
            list_res = await c.get("/api/conversations", headers=headers)
            assert list_res.status_code == 200
            convs = list_res.json()
            assert any(s["id"] == session_id for s in convs)

            # 3. Get messages for the session
            msg_res = await c.get(f"/api/conversations/{session_id}/messages", headers=headers)
            assert msg_res.status_code == 200
            assert isinstance(msg_res.json(), list)

            # 4. Delete the conversation
            del_res = await c.delete(f"/api/conversations/{session_id}", headers=headers)
            assert del_res.status_code == 200
            assert del_res.json()["success"] is True

    asyncio.run(run())
