# Google ADK E-Commerce POC

A modular, enterprise-ready E-Commerce assistant built with the **Google Agent Development Kit (ADK)**, **FastAPI**, and **PostgreSQL**.

---

## Architecture Overview

```text
google sdk/
├── ecommerce_agent/
│   ├── .adk/               # ADK SQLite session persistence (session.db)
│   ├── agent.py            # ADK commerce_agent (LlmAgent) & dynamic profile instructions
│   ├── server.py           # Unified headless FastAPI server (web=False, CORS, /run_sse, /api/...)
│   ├── config.py           # Pydantic settings & environment configuration
│   ├── db/                 # PostgreSQL models, async connection, and repositories
│   ├── tools/              # 18 Google ADK function tools
│   ├── api/                # REST endpoints (products, cart, orders, users, conversations, actions)
│   ├── schemas/            # Pydantic input/output validation models
│   ├── services/           # In-memory ticket drafts & mock auth resolver
│   └── docs/               # Detailed documentation
├── frontend/               # Full Next.js 15 application (TypeScript, Tailwind CSS, Lucide)
│   ├── src/app/            # App router (/, /products/[id], /cart, /orders, /chat, /profile, /login)
│   ├── src/components/     # Navbar, CartDrawer, FloatingChatWidget, ProductCard, ProposalCard
│   ├── src/context/        # AuthContext, CartContext, ChatContext
│   └── src/lib/            # Typed API client & data models
├── weather_time_agent/     # Preserved independent agent
├── ecommerce_poc.sql       # PostgreSQL schema & sample seeded data
├── requirements.txt        # Python dependencies
└── readme.md
```

---

## Quick Start

### 1. Configure Environment
Verify `.env` in `ecommerce_agent/.env`:
```ini
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/ecommerce_demo
DB_SCHEMA=ecommerce_poc
MOCK_USER_ID=1
MODEL=gemini-2.5-flash
```

### 2. Run the Headless Backend Server
```powershell
python -m ecommerce_agent.server
```
- **Interactive Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Conversational SSE Stream**: `POST /run_sse`
- **Proposal Approval API**: `POST /api/proposals/{id}/approve`

### 3. Run the Next.js Frontend Web Application
```powershell
cd frontend
npm run dev
```
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **Demo Switcher / Sign In**: [http://localhost:3000/login](http://localhost:3000/login)
- **AI Shopping Assistant**: [http://localhost:3000/chat](http://localhost:3000/chat)

### 4. Run the Test Suite
```powershell
$env:PYTHONPATH=".\venv\Lib\site-packages"
python -m pytest ecommerce_agent/tests
```

---

## Detailed Documentation

- **[Agent Architecture & Specification (agents.md)](agents.md)**: Agent inventory, dynamic prompt injection, guardrails, and full 18-tool catalog.
- **[API Specification](ecommerce_agent/docs/Api_doc.md)**: Exhaustive request/response JSON schemas, SSE streaming protocol, and status codes.
- **[Frontend Integration Guide](ecommerce_agent/docs/frontend_integration.md)**: Sequence diagrams, session management, and React/TypeScript client code.
