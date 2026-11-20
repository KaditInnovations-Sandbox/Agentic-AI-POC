# E-Commerce Agent Documentation

Welcome to the **Google ADK E-Commerce Agent** documentation directory.

## Documentation Index

1. **[Agent Architecture & Specification (agents.md)](../../agents.md)**
   - Complete inventory of agents (`commerce_agent`, `weather_time_agent`).
   - Dynamic prompt injection and user profile read-only guardrails.
   - 18 tool catalog categorized into 6 domains.
   - Two-stage approval boundaries and state persistence architecture.
   - Future multi-agent roadmap.

2. **[Backend API Specification](./Api_doc.md)**
   - Complete reference for all endpoints exposed by `ecommerce_agent/server.py`.
   - Google ADK Conversational Streaming (`POST /run_sse`) and Unary (`POST /run`).
   - SQLite session management (`/apps/ecommerce_agent/users/{user_id}/sessions`).
   - Deterministic Transactional Action APIs:
     - `POST /api/proposals/{proposal_id}/approve`
     - `POST /api/tickets/drafts/{draft_id}/submit`
     - `POST /api/orders/{order_id}/cancel`
   - Request and response schemas, validation errors, and curl examples.

3. **[Frontend Integration Guide](./frontend_integration.md)**
   - Architectural pattern: Hybrid Conversational UI + Native Deterministic Components.
   - Sequence diagrams for discovery, quoting, and order execution.
   - Handling Server-Sent Events (SSE) streaming in JavaScript/TypeScript.
   - Complete production-grade React / Next.js implementation:
     - Typed API Client (`agentClient.ts`)
     - Custom React Hook (`useAgentChat.ts`)
     - Interactive Proposal Card Component (`OrderProposalCard.tsx`)
   - Session lifecycle and conversation restoration on reload.

---

## Quick Start

### 1. Run the Backend API & ADK Agent Server
```powershell
python -m ecommerce_agent.server
```
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **OpenAPI Schema**: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

### 2. Run the Next.js Frontend Application
```powershell
cd frontend
npm run dev
```
- **Frontend Web Store**: [http://localhost:3000](http://localhost:3000)
- **Demo Login / User Switcher**: [http://localhost:3000/login](http://localhost:3000/login)
- **Dedicated AI Shopping Assistant**: [http://localhost:3000/chat](http://localhost:3000/chat)
