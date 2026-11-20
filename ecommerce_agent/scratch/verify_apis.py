import asyncio
import json
from httpx import AsyncClient, ASGITransport
from ecommerce_agent.server import app

async def test_all_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"x-user-id": "1"}
        
        # 1. Health
        r = await client.get("/health")
        print(f"GET /health: {r.status_code}")
        assert r.status_code == 200, r.text
        
        # 2. Users & Profile
        r = await client.get("/api/users")
        print(f"GET /api/users: {r.status_code}, count={len(r.json())}")
        assert r.status_code == 200, r.text
        
        r = await client.get("/api/profile", headers=headers)
        print(f"GET /api/profile: {r.status_code}, user={r.json().get('full_name')}")
        assert r.status_code == 200, r.text
        
        # 3. Products
        r = await client.get("/api/products")
        print(f"GET /api/products: {r.status_code}, total={r.json().get('total')}")
        assert r.status_code == 200, r.text
        items = r.json().get("items", [])
        assert len(items) > 0, "No items in catalog"
        p_id = items[0]["id"]
        
        # Check rating field in products
        for p in items[:5]:
            print(f"Product {p['id']} rating: average_rating={p.get('average_rating')}, review_count={p.get('review_count')}")
            
        r = await client.get("/api/products/filters")
        print(f"GET /api/products/filters: {r.status_code}, categories={len(r.json().get('categories', []))}")
        assert r.status_code == 200, r.text
        
        r = await client.get(f"/api/products/{p_id}")
        print(f"GET /api/products/{p_id}: {r.status_code}, name={r.json().get('name')}")
        assert r.status_code == 200, r.text
        p_det = r.json()
        print(f"ProductDetail rating: average_rating={p_det.get('average_rating')}, review_count={p_det.get('review_count')}, available_qty={p_det.get('available_qty')}")
        
        # 4. Cart
        r = await client.get("/api/cart", headers=headers)
        print(f"GET /api/cart: {r.status_code}, items={len(r.json().get('items', []))}")
        assert r.status_code == 200, r.text
        
        # 5. Orders
        r = await client.get("/api/orders", headers=headers)
        print(f"GET /api/orders: {r.status_code}, count={len(r.json())}")
        assert r.status_code == 200, r.text
        orders = r.json()
        if orders:
            ord_id = orders[0]["id"]
            r = await client.get(f"/api/orders/{ord_id}", headers=headers)
            print(f"GET /api/orders/{ord_id}: {r.status_code}")
            assert r.status_code == 200, r.text
            ord_data = r.json()
            print(f"Order {ord_id} details: status={ord_data['order']['status']}, items={len(ord_data['order']['items'])}, eligible_cancel={ord_data['cancellation_eligibility']['is_eligible_for_cancellation']}")
            
        # 6. Conversations
        r = await client.get("/api/conversations", headers=headers)
        print(f"GET /api/conversations: {r.status_code}, count={len(r.json())}")
        assert r.status_code == 200, r.text
        
        print("\n=== ALL REST GET APIS VERIFIED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(test_all_endpoints())
