# Frontend Changelog - E-Commerce AI Assistant

All notable changes to the Next.js 15 frontend application (`frontend/`) are documented in this file.

---

## [0.1.0] - Phase 1 POC Release - 2026-11-20

### 🌟 Overview
Initial Phase 1 release of the modern e-commerce storefront with integrated conversational AI shopping advisor, built with **Next.js 15.5**, **React 19**, **Tailwind CSS**, and **Lucide React**.

---

### ✨ Features Added

#### 1. Storefront & Catalog Experience
- **Catalog Discovery (`/`)**:
  - Live search with debounce for keyword product matching.
  - Dynamic filter panel: Category selection, brand multi-select, price range slider, and in-stock toggles.
  - Responsive product grid with rating badges, stock counters, and "Add to Cart" triggers.
- **Product Details (`/products/[id]`)**:
  - Technical specification tables parsed from PostgreSQL JSONB attributes.
  - Verified user reviews list with average star rating.
  - Quantity selector and direct cart addition.
- **Cart Management (`/cart` & `CartDrawer.tsx`)**:
  - Persistent shopping cart backed by REST API.
  - Quantity increment, decrement, and item removal.
  - Real-time subtotal, shipping breakdown, and checkout review.
- **Orders & Tracking (`/orders` & `/orders/[id]`)**:
  - Order history listing sorted newest first.
  - Order status badges (`placed`, `packed`, `shipped`, `delivered`, `cancelled`).
  - Detailed line items, delivery address, and policy-compliant cancellation button.
- **Customer Profile (`/profile`)**:
  - Read-only display of authenticated user profile, shipping destination, and brand preferences.

#### 2. AI Chatbot Experience
- **Full Chat Interface (`/chat`)**:
  - Session history sidebar with active conversation switching and new session creation.
  - Token-by-token natural language text streaming over SSE (`/run_sse`).
  - Assistant message feedback controls (Thumbs Up / Thumbs Down) with one-click recording.
  - Stop button to abort active generations via `AbortController`.
- **Floating Chat Widget (`FloatingChatWidget.tsx`)**:
  - Globally accessible floating action button across all store pages.
  - Expandable 440px desktop drawer / full mobile sheet with unread message badge.
  - Direct integration with shared `ChatContext`.

#### 3. Dual-Capture Card Rendering Engine
- **Live SSE Tool Interception**:
  - In `ChatContext.tsx`, intercepts `functionResponse` events from `/run_sse` to mount rich interactive components alongside streaming text:
    - `search_products` / `get_product_details` $\rightarrow$ mounts `<ChatProductList>` and `<ChatProductCard>`.
    - `create_order_proposal` / `update_order_proposal` $\rightarrow$ mounts `<OrderProposalCard>`.
    - `prepare_support_ticket_draft` $\rightarrow$ mounts `<SupportDraftCard>`.
    - `get_cart` $\rightarrow$ mounts `<ChatCartCard>`.
    - `get_order_details` $\rightarrow$ mounts `<ChatOrderCard>`.
- **Historical State Hydration**:
  - Uses `extractEmbeddedEntities(text)` fallback for page refreshes and reopened sessions.
  - Automatically queries `GET /api/proposals/{id}` to restore countdown timers and approval states.

#### 4. Markdown & Typography Engine (`MarkdownMessage.tsx`)
- Formats markdown headers, bold/italic text, ordered and unordered lists, blockquotes, and tables.
- Code blocks with syntax highlighting and instant one-click copy button.

---

### 🛠️ UI/UX Improvements & Bug Fixes

- **Single Loader Consolidation**:
  - Eliminated three simultaneous spinning loaders during streaming (top activity pill, inner bubble loader, and bottom input bar).
  - Consolidated into a single clean loading state inside the message bubble.
- **Fixed Indefinite Spinner Bug**:
  - Cleared `activeActivity: null` across `text_delta`, `text_replace`, `done`, and `stopGenerating` so loaders disappear immediately when content arrives.
- **Card Responsiveness in Floating Drawer**:
  - Replaced `grid sm:grid-cols-2` with `flex flex-col gap-2.5 w-full` to prevent column squishing in the 440px floating widget.
  - Added `shrink-0` and `whitespace-nowrap` to action buttons (`Details`, `Add to Cart`), completely eliminating clipped text.
- **Customer-Centric Copy**:
  - Removed internal developer jargon ("order proposal", "proposal ID", "immutable price snapshot", "PostgreSQL", "Phase 2") in favor of user-friendly terms ("Checkout Review", "Price Lock", "Verify order details").
- **Multiple Proposals Support**:
  - Updated `ChatContext.tsx` and `MessageBubble.tsx` to preserve and render multiple proposals when users request multiple items simultaneously (e.g. "Buy both").

---

### 🔒 Build & DevOps
- Fully compatible with Next.js 15 App Router and React 19.
- Added [Dockerfile](Dockerfile) and [.dockerignore](.dockerignore).
- Created [frontend/.env.example](.env.example) and excluded `.env` files from Git.
