# Backend Changelog - E-Commerce ADK Agent (`ecommerce_agent`)

All notable changes to the Python FastAPI and Google Agent Development Kit (ADK) backend are documented in this file.

---

## [0.1.0] - Phase 1 POC Release - 2026-11-20

### 🌟 Overview
Initial Phase 1 release of the headless Google ADK conversational backend for the enterprise e-commerce platform, integrating **Google Gemini** (`gemini-2.5-flash` / `gemini-3.5-flash-lite`), **FastAPI**, **SQLAlchemy 2.0 async**, and **PostgreSQL**.

---

### ✨ Features Added

#### 1. Google ADK Agent Architecture (`ecommerce_agent/agent.py`)
- Configured `commerce_agent` with dynamic prompt generator `build_commerce_agent_instructions()`.
- Server-enforced customer identity (`MOCK_USER_ID=1`, Asha Kumar); customer ID is never accepted as an argument to Gemini tool calls.
- Injects user profile, delivery address, and brand preferences directly into system prompt per turn.
- **Identity & Security Guardrails**:
  - Hard-pinned identity as "Shopity Shopping Advisor, powered by Google Gemini".
  - Explicitly prohibits false attributions (e.g. Anthropic/OpenAI).
  - Enforced prompt injection & roleplay jailbreak defenses.

#### 2. Comprehensive 22-Tool Catalog Across 6 Domains
- **Profile & System**:
  - `get_user_profile`: Returns verified user profile, address, and shopping constraints.
  - `check_database_status`: Verifies live PostgreSQL latency and schema health.
- **Product Discovery & Comparison**:
  - `get_available_filters`: Queries live catalog for categories, brands, price min/max, tags, and JSONB spec keys.
  - `search_products`: Multi-criteria parameterized search across keywords, category, brand, price, stock, and JSONB specs.
  - `get_product_details`: Retrieves comprehensive specs, reviews, and stock levels.
  - `compare_products`: Side-by-side spec alignment matrix for 2-4 products, explicitly flagging missing specs.
- **Cart Management**:
  - `get_cart`: Returns active cart items, quantities, and subtotal.
  - `add_to_cart`: Adds items with real-time inventory validation.
  - `update_cart_item`: Modifies item quantity (removes if quantity=0).
  - `remove_cart_item`: Deletes an item from cart.
- **Orders & Proposals**:
  - `get_order_history`: Fetches past orders sorted newest first.
  - `get_order_details`: Line items, tracking status, and delivery address.
  - `create_order_proposal`: Generates an immutable 15-minute price lock snapshot in PostgreSQL (`order_proposals`).
  - `get_order_proposal`: Retrieves proposal status and expiration countdown.
  - `update_order_proposal`: Modifies quantity/price snapshot on existing pending proposals instead of creating duplicates.
  - `cancel_order_proposal`: Cancels pending proposals when user rejects them via conversational prompts.
  - `check_order_cancellation_eligibility`: Enforces order cancellation policy (`placed` status only).
- **Customer Support Triage**:
  - `get_support_tickets`: Lists customer support tickets and status.
  - `prepare_support_ticket_draft`: Creates an in-session preview draft (`DFT-...`) before submission.
  - `update_support_ticket_draft`: Modifies subject or description of an existing pending draft.
  - `cancel_support_ticket_draft`: Discards a pending support draft.
- **Analytics & Spending Intelligence**:
  - `get_order_value_summary`: Calculates gross spend across valid orders, average order value, and cancellation count.

#### 3. Two-Stage Approval & Deterministic Execution
- Zero write access for financial transactions granted to LLM:
  - Gemini only creates quote proposals; order execution requires human REST action.
- Action Endpoints (`ecommerce_agent/api/actions.py`):
  - `POST /api/proposals/{proposal_id}/approve`: 5-step revalidation protocol: (1) ownership check, (2) expiration check, (3) live price recheck, (4) stock quantity validation, (5) atomic transaction.
  - Idempotent execution: Repeated clicks return the existing placed order without double-charging or deducting duplicate inventory.
  - `POST /api/tickets/drafts/{draft_id}/submit`: Commits preview drafts to PostgreSQL `support_tickets`.
  - `POST /api/orders/{order_id}/cancel`: Atomically cancels eligible orders.

#### 4. REST APIs for Storefront Operations
- `/api/products`: Catalog querying, details, and dynamic filter discovery.
- `/api/cart`: Shopping cart mutations.
- `/api/orders`: Order history, detail inspection, and cancellation eligibility.
- `/api/conversations`: Multi-session management, message turn retrieval, and feedback recording (`POST /messages/{id}/feedback`).
- `/api/users/profile`: Authenticated user profile retrieval.

#### 5. Persistence & Storage Separation
- **Conversational Memory**: Managed by Google ADK in SQLite (`.adk/session.db`).
- **Business Data**: Stored in PostgreSQL (`ecommerce_demo`, schema `ecommerce_poc`).

---

### 🧪 Testing & Quality Assurance
- 39 automated integration and unit tests passing with pytest:
  - `test_db_integration.py`: PostgreSQL schema and query verification.
  - `test_agent_startup.py`: Tool registration, identity anchors, and prompt injection defense assertions.
  - `test_cart.py`: Cart lifecycle and inventory validation.
  - `test_orders_and_proposals.py`: Price snapshot generation, countdown validity, and proposal approvals.
  - `test_support_drafts.py`: Support draft lifecycle.
  - `test_order_value_analytics.py`: Financial analytics calculations.
  - `test_rest_apis.py`: REST endpoint response contracts.

---

### 🔒 DevOps & Containerization
- Added root [Dockerfile](../Dockerfile) (Python 3.12-slim) and [.dockerignore](../.dockerignore).
- Created [ecommerce_agent/.env.example](.env.example).
- Excluded all `.adk/session.db` and runtime databases from Git.
