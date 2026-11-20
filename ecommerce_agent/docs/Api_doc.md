# E-Commerce Google ADK Agent - Backend API Documentation

This document provides a comprehensive API specification for the headless Google ADK backend server (`ecommerce_agent/server.py`).

The server combines:
1. **Google ADK Conversational & Session Streaming** (`/run_sse`, `/run`, `/apps/...`)
2. **REST Endpoints for Products, Filters, Cart, Orders, Profile, and Conversations** (`/api/...`)
3. **Deterministic Transactional Actions** (`/api/proposals/...`, `/api/tickets/...`, `/api/orders/...`)
4. **Health & Diagnostics** (`/health`, `/docs`)

---

## 1. Server Overview & Architecture

- **Host & Port**: `http://127.0.0.1:8000` (configurable via host/port flags)
- **Interactive Swagger UI**: `http://127.0.0.1:8000/docs`
- **OpenAPI JSON**: `http://127.0.0.1:8000/openapi.json`
- **CORS Support**: Enabled by default (`*` in development; configure origin whitelist in production)
- **App Name**: `ecommerce_agent`

### Authentication & User Context
- The backend supports dynamic identity resolution via the `x-user-id` HTTP header (or `user_id` query parameter).
- If omitted, identity falls back to `settings.mock_user_id` (`1` = Asha Kumar).
- Seeded users for testing:
  - User 1: `Asha Kumar` (`asha@example.test`)
  - User 2: `Rahul Menon` (`rahul@example.test`)
  - User 3: `Priya Shah` (`priya@example.test`)
  - User 4: `Demo Admin` (`admin@example.test`)

---

## 2. Products & Catalog Endpoints

### 2.1 List Products with Search, Filters & Pagination
- **Method**: `GET`
- **Path**: `/api/products`
- **Query Parameters**:
  - `q` (string, optional): Search query across name, brand, description, and tags.
  - `category_id` (int, optional): Filter by category.
  - `brand` (string, optional): Filter by brand (e.g. `Dell`, `Lenovo`, `Sony`).
  - `min_price` (float, optional): Minimum price in INR.
  - `max_price` (float, optional): Maximum price in INR.
  - `in_stock_only` (bool, optional): Filter only in-stock items (`true` / `false`).
  - `tag` (string, optional): Filter by tag (e.g. `laptop`, `premium`, `wireless`).
  - `sort_by` (string, optional): Sort order (`relevance`, `price_asc`, `price_desc`, `rating_desc`). Default: `relevance`.
  - `page` (int, optional): Page number (default: `1`).
  - `page_size` (int, optional): Page size (default: `12`, max: `100`).
- **Response** (`200 OK`):
```json
{
  "items": [
    {
      "id": 101,
      "category_id": 3,
      "category_name": "Laptops",
      "sku": "LAP-DEL-101",
      "name": "Dell Inspiron 14 Demo",
      "brand": "Dell",
      "description": "Everyday laptop for work and study",
      "price_inr": 54990.0,
      "tags": ["laptop", "budget"],
      "in_stock": true,
      "available_qty": 8,
      "avg_rating": 4.5,
      "review_count": 2
    }
  ],
  "total": 14,
  "page": 1,
  "page_size": 12,
  "total_pages": 2
}
```

### 2.2 Dynamic Faceted Filters
- **Method**: `GET`
- **Path**: `/api/products/filters`
- **Query Parameters**:
  - `category_id` (int, optional): Narrow down filters to a specific category.
- **Response** (`200 OK`):
```json
{
  "categories": [
    {"id": 3, "name": "Laptops", "count": 6},
    {"id": 4, "name": "Audio", "count": 3},
    {"id": 5, "name": "Accessories", "count": 3},
    {"id": 6, "name": "Phones", "count": 2}
  ],
  "brands": ["Acer", "Apple", "Dell", "HP", "JBL", "Lenovo", "Logitech", "Motorola", "Samsung", "SanDisk", "Sony", "boAt"],
  "price_range": {
    "min": 999.0,
    "max": 79990.0
  },
  "tags": ["accessory", "android", "audio", "budget", "charger", "headphones", "laptop", "mouse", "office", "phone", "premium", "wireless"]
}
```

### 2.3 Product Details
- **Method**: `GET`
- **Path**: `/api/products/{product_id}`
- **Response** (`200 OK`):
```json
{
  "id": 101,
  "category_id": 3,
  "category_name": "Laptops",
  "sku": "LAP-DEL-101",
  "name": "Dell Inspiron 14 Demo",
  "brand": "Dell",
  "description": "Everyday laptop for work and study",
  "price_inr": 54990.0,
  "tags": ["laptop", "budget"],
  "in_stock": true,
  "available_qty": 8,
  "avg_rating": 4.5,
  "review_count": 2,
  "features": {"battery_hours_claimed": 8, "backlit_keyboard": false},
  "specs": {"ram_gb": 8, "storage_gb": 512, "processor": "Core i3", "weight_kg": 1.55},
  "reviews": [
    {
      "id": 1,
      "user_name": "Asha Kumar",
      "rating": 5,
      "title": "Great office laptop",
      "body": "Good performance for my daily work."
    }
  ]
}
```

---

## 3. Shopping Cart Endpoints

### 3.1 Get Active Cart
- **Method**: `GET`
- **Path**: `/api/cart`
- **Headers**: `x-user-id: 1`
- **Response** (`200 OK`):
```json
{
  "user_id": 1,
  "cart_id": 1,
  "items": [
    {
      "product_id": 102,
      "sku": "LAP-DEL-102",
      "name": "Dell Inspiron 15 Demo",
      "brand": "Dell",
      "unit_price_inr": 58990.0,
      "quantity": 1,
      "line_total_inr": 58990.0,
      "available_qty": 15,
      "in_stock": true
    }
  ],
  "total_items": 1,
  "cart_total_inr": 58990.0
}
```

### 3.2 Add Item to Cart
- **Method**: `POST`
- **Path**: `/api/cart/items`
- **Headers**: `x-user-id: 1`
- **Request Body**:
```json
{
  "product_id": 101,
  "quantity": 1
}
```
- **Response** (`200 OK`):
```json
{
  "status": "success",
  "message": "Added 1 unit(s) of Dell Inspiron 14 Demo to your cart.",
  "cart": { ... }
}
```

### 3.3 Update Item Quantity
- **Method**: `PATCH`
- **Path**: `/api/cart/items/{product_id}`
- **Headers**: `x-user-id: 1`
- **Request Body**:
```json
{
  "quantity": 2
}
```

### 3.4 Remove Item from Cart
- **Method**: `DELETE`
- **Path**: `/api/cart/items/{product_id}`
- **Headers**: `x-user-id: 1`

---

## 4. Customer Orders Endpoints

### 4.1 Order History List
- **Method**: `GET`
- **Path**: `/api/orders`
- **Headers**: `x-user-id: 1`
- **Query Parameters**: `limit` (int, default: `20`)
- **Response** (`200 OK`):
```json
[
  {
    "id": 1,
    "order_number": "ORD-1001",
    "user_id": 1,
    "status": "delivered",
    "total_inr": 56485.0,
    "items_count": 2,
    "placed_at": "2026-10-10T12:00:00Z",
    "shipping_address": {"city": "Chennai", "state": "Tamil Nadu", "country": "India"}
  }
]
```

### 4.2 Order Details & Cancellation Eligibility
- **Method**: `GET`
- **Path**: `/api/orders/{order_id}`
- **Headers**: `x-user-id: 1`
- **Response** (`200 OK`):
```json
{
  "order": {
    "id": 1,
    "order_number": "ORD-1001",
    "user_id": 1,
    "status": "delivered",
    "total_inr": 56485.0,
    "items": [
      {
        "product_id": 101,
        "product_name": "Dell Inspiron 14 Demo",
        "sku": "LAP-DEL-101",
        "brand": "Dell",
        "quantity": 1,
        "unit_price_inr": 54990.0,
        "line_total_inr": 54990.0
      }
    ],
    "shipping_address": {"city": "Chennai", "state": "Tamil Nadu", "country": "India"},
    "placed_at": "2026-10-10T12:00:00Z"
  },
  "cancellation_eligibility": {
    "order_id": 1,
    "current_status": "delivered",
    "can_cancel": false,
    "reason": "Order cannot be cancelled because its status is 'delivered'. Only orders in 'placed' status can be cancelled."
  }
}
```

### 4.3 Cancel Placed Order
- **Method**: `POST`
- **Path**: `/api/orders/{order_id}/cancel`
- **Headers**: `x-user-id: 1`
- **Request Body**:
```json
{
  "reason": "Found better deal"
}
```

---

## 5. Conversation History & Chat Sessions

### 5.1 List Conversation Sessions
- **Method**: `GET`
- **Path**: `/api/conversations`
- **Headers**: `x-user-id: 1`
- **Response** (`200 OK`):
```json
[
  {
    "id": "sess_8f3b2a1c",
    "title": "Recommend a Dell laptop for coding under ₹60,000",
    "updated_at": 1795075184.0,
    "message_count": 4,
    "preview": "Recommend a Dell laptop for coding under ₹60,000"
  }
]
```

### 5.2 Create New Conversation Session
- **Method**: `POST`
- **Path**: `/api/conversations`
- **Headers**: `x-user-id: 1`
- **Request Body**: `{"session_id": null}` (generates UUID if omitted)

### 5.3 Get Conversation Messages (Resume Chat)
- **Method**: `GET`
- **Path**: `/api/conversations/{session_id}/messages`
- **Headers**: `x-user-id: 1`
- **Response** (`200 OK`):
```json
[
  {
    "id": "msg_0",
    "role": "user",
    "text": "Find me laptops under 60k",
    "timestamp": 1795075184.0
  },
  {
    "id": "msg_1",
    "role": "model",
    "text": "I found the Dell Inspiron 14 priced at ₹54,990...",
    "timestamp": 1795075186.0
  }
]
```

### 5.4 Record Message Feedback (Thumbs Up / Down)
- **Method**: `POST`
- **Path**: `/api/conversations/{session_id}/messages/{message_id}/feedback`
- **Headers**: `x-user-id: 1`
- **Request Body**:
```json
{
  "feedback": "up"
}
```
*(Accepts `"up"`, `"down"`, or `null` to clear)*.

### 5.5 Delete Conversation Session
- **Method**: `DELETE`
- **Path**: `/api/conversations/{session_id}`
- **Headers**: `x-user-id: 1`

---

## 6. Real-Time Streaming Chat (`POST /run_sse`)

- **Method**: `POST`
- **Path**: `/run_sse`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: text/event-stream`
  - `x-user-id: 1`
- **Request Body**:
```json
{
  "appName": "ecommerce_agent",
  "userId": "1",
  "sessionId": "sess_8f3b2a1c",
  "newMessage": {
    "role": "user",
    "parts": [{"text": "Can I get a formal quote for Dell Inspiron 14?"}]
  },
  "streaming": true
}
```

---

## 7. Deterministic Action Endpoints

### 7.1 Approve & Execute Order Proposal
- **Method**: `POST`
- **Path**: `/api/proposals/{proposal_id}/approve`
- **Headers**: `x-user-id: 1`
- **Request Body**:
```json
{
  "payment_method": "credit_card",
  "shipping_address": "45 MG Road, Indiranagar, Bengaluru, KA 560038",
  "idempotency_key": "prop_12_req_99214"
}
```

### 7.2 Submit Support Ticket Draft
- **Method**: `POST`
- **Path**: `/api/tickets/drafts/{draft_id}/submit`
- **Headers**: `x-user-id: 1`

---

## 8. Users & Profile Endpoints

### 8.1 List Seeded Demo Users
- **Method**: `GET`
- **Path**: `/api/users`

### 8.2 Customer Profile & Preferences
- **Method**: `GET`
- **Path**: `/api/profile`
- **Headers**: `x-user-id: 1`
- **Response** (`200 OK`):
```json
{
  "id": 1,
  "full_name": "Asha Kumar",
  "email": "asha@example.test",
  "role": "customer",
  "preferences": {
    "preferred_brands": ["Dell", "Lenovo"],
    "budget_inr": 60000
  },
  "editable": false
}
```
