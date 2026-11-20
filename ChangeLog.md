# Changelog - E-Commerce AI Agent Platform (Phase 1 POC)

All notable changes to the root project across the Backend (`ecommerce_agent`), Frontend (`frontend`), and Google ADK integration are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - Phase 1 POC Release - 2026-11-20

### 🚀 Highlights & Architectural Overview
- **Unified Headless Backend Server**: Powered by FastAPI and Google Agent Development Kit (ADK) serving both conversational streaming (`/run_sse`) and complete REST APIs on port 8000.
- **Enterprise Conversational Agent (`commerce_agent`)**: Powered by Google Gemini (`gemini-2.5-flash` / `gemini-3.5-flash-lite`) equipped with 22 function tools across 6 operational domains.
- **Two-Stage Approval Safety Boundary**: Deterministic financial execution. The LLM can only create immutable 15-minute price snapshot proposals (`order_proposals`); human checkout is executed via authenticated REST API (`POST /api/proposals/{id}/approve`).
- **Modern Next.js 15 Frontend**: Complete e-commerce store with catalog discovery, dynamic filters, product detail views, persistent shopping cart, order tracking, profile dashboard, and dual-mode conversational assistant (dedicated `/chat` page and global floating widget).
- **Dual-Capture Card Rendering Engine**: Real-time SSE tool inspection and historical regex entity extraction rendering interactive UI cards for products, proposals, support drafts, cart, and orders.

---

### 📦 Backend (`ecommerce_agent`)

#### Added
- **Core Agent Architecture**:
  - `ecommerce_agent/agent.py`: `LlmAgent` implementation with dynamic prompt generator `build_commerce_agent_instructions()`.
  - Injected user profile, address, and shopping constraints into context per turn.
  - Server-enforced identity (`MOCK_USER_ID=1`, Asha Kumar) preventing LLM spoofing.
  - Strict **Identity & Security Invariants**: Hard-pinned identity as "Shopity Shopping Advisor, powered by Google Gemini", explicitly blocking false third-party attributions (Anthropic/OpenAI) and prompt injection jailbreaks.
- **22 ADK Function Tools (6 Domains)**:
  - *Profile & System*: `get_user_profile`, `check_database_status`.
  - *Product Discovery*: `get_available_filters`, `search_products`, `get_product_details`, `compare_products`.
  - *Cart Management*: `get_cart`, `add_to_cart`, `update_cart_item`, `remove_cart_item`.
  - *Orders & Proposals*: `get_order_history`, `get_order_details`, `create_order_proposal`, `get_order_proposal`, `update_order_proposal`, `cancel_order_proposal`, `check_order_cancellation_eligibility`.
  - *Customer Support*: `get_support_tickets`, `prepare_support_ticket_draft`, `update_support_ticket_draft`, `cancel_support_ticket_draft`.
  - *Analytics*: `get_order_value_summary`.
- **Database & Repositories (PostgreSQL + asyncpg + SQLAlchemy 2.0)**:
  - Relational schema `ecommerce_poc` with models for `Category`, `Product`, `Inventory`, `Customer`, `Order`, `OrderItem`, `OrderProposal`, `SupportTicket`.
  - Atomicity and real-time inventory validation on approval.
- **State & Memory Boundary**:
  - Conversational memory stored in SQLite (`.adk/session.db`) via ADK.
  - Business transactional records strictly isolated in PostgreSQL (`ecommerce_demo`).
- **Direct REST Action Endpoints**:
  - `POST /api/proposals/{id}/approve`: 5-step revalidation protocol with idempotency.
  - `GET /api/proposals/{id}`: Live proposal status reconciliation.
  - `POST /api/tickets/drafts/{draft_id}/submit`: Preview ticket conversion to PostgreSQL ticket.
  - `POST /api/orders/{id}/cancel`: Cancellation policy enforcement (`placed` status only).
- **Comprehensive Pytest Suite**:
  - 39 integration and unit tests covering startups, tools, proposals, analytics, and identity invariants (`pytest ecommerce_agent/tests`).

---

### 💻 Frontend (`frontend`)

#### Added
- **Next.js 15 App Router & React 19**:
  - Catalog Page (`/`): Search, category & brand filters, price range sliders, in-stock toggles, pagination, and responsive product grid.
  - Product Detail Page (`/products/[id]`): Specs, ratings, inventory badges, and quantity cart controls.
  - Cart Page (`/cart`): Real-time item listing, quantity modifier, subtotal calculation, and checkout drawer.
  - Orders Page (`/orders` & `/orders/[id]`): Past order history, tracking badges, itemized line items, and cancellation button.
  - Profile Page (`/profile`): Read-only customer information, delivery address, and preferences.
  - Full Chat Page (`/chat`): Multi-session sidebar, real-time message stream, and feedback thumbs.
  - Global Floating Chat Widget (`FloatingChatWidget.tsx`): Expandable 440px drawer with unread counter badge.
- **Dual-Capture UI Card Rendering Engine**:
  - `ChatProductCard.tsx` / `ChatProductList`: Responsive full-width cards with non-wrapping action buttons.
  - `OrderProposalCard.tsx`: 15-minute countdown clock, price lock display, one-click "Approve & Place Order" button, and idempotency handling.
  - `SupportDraftCard.tsx`: Subject/description preview with "Submit Support Ticket" button.
  - `ChatOrderCard.tsx`: Tracking status and order details.
  - `ChatCartCard.tsx`: Live cart snapshot.
- **Enhanced Message Markdown Engine (`MarkdownMessage.tsx`)**:
  - GitHub Flavored Markdown (GFM) tables, syntax-highlighted code blocks with copy button, blockquotes, bold/italic formatting, and sanitization.
- **UX & Streaming Enhancements**:
  - Consolidated streaming indicator: Eliminated redundant triple-spinners into a single clean in-bubble activity loader.
  - Activity clearance: Fixed indefinite spinning bug by resetting `activeActivity` upon token arrival and stream completion.
  - Responsive layout: Fixed squished/clipped buttons in the floating chat drawer by adopting vertical stacked card lists.

---

### 🛡️ Security & DevOps

#### Added
- **Environment & Secret Hygiene**:
  - Completely excluded `.adk/`, `*.db`, `*.sqlite`, `.env`, and `.env.local` from Git tracking.
  - Created documented templates: `ecommerce_agent/.env.example` and `frontend/.env.example`.
- **Containerization**:
  - Root `Dockerfile` for Python 3.12 FastAPI / ADK server with `.dockerignore`.
  - `frontend/Dockerfile` for Next.js 15 standalone/runner with `frontend/.dockerignore`.
