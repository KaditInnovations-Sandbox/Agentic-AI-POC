"""Unified Headless Backend Server for Google ADK E-Commerce Agent.

Serves both Google ADK conversational endpoints (/run_sse, /run, /apps/...)
and full REST APIs for products, filters, cart, orders, profile, and conversation history
on a single port with CORS configured for external frontend applications (Next.js/React/mobile).
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from google.adk.cli.fast_api import get_fast_api_app

from ecommerce_agent.api.actions import router as actions_router
from ecommerce_agent.api.cart import router as cart_router
from ecommerce_agent.api.conversations import router as conversations_router
from ecommerce_agent.api.orders import router as orders_router
from ecommerce_agent.api.products import router as products_router
from ecommerce_agent.api.users import router as users_router
from ecommerce_agent.db.check_connection import run_startup_db_check
from ecommerce_agent.services.auth import (
    resolve_user_id_from_request,
    set_request_user_id,
)


def create_app() -> FastAPI:
    """Creates and configures the unified headless FastAPI application."""
    # 1. Initialize ADK headless FastAPI app (web=False disables the Dev-UI)
    app = get_fast_api_app(
        agents_dir=".",
        web=False,
        allow_origins=["*"],
        auto_create_session=True,
    )

    # 2. Extract ADK internal session_service and attach to app.state
    session_service = None
    for r in app.routes:
        if (
            getattr(r, "path", None) == "/apps/{app_name}/users/{user_id}/sessions"
            and "GET" in getattr(r, "methods", [])
        ):
            closure = getattr(r.endpoint, "__closure__", None)
            if closure:
                api_server = closure[0].cell_contents
                session_service = getattr(api_server, "session_service", None)
                break
    app.state.session_service = session_service

    # 3. Request-scoped user identity middleware (resolves from x-user-id header or query)
    @app.middleware("http")
    async def user_context_middleware(request: Request, call_next):
        user_id = resolve_user_id_from_request(request)
        set_request_user_id(user_id)
        try:
            return await call_next(request)
        finally:
            set_request_user_id(None)

    # 4. Mount all REST API routers
    app.include_router(products_router)
    app.include_router(orders_router)
    app.include_router(cart_router)
    app.include_router(conversations_router)
    app.include_router(users_router)
    app.include_router(actions_router)

    # 5. Startup healthcheck
    @app.on_event("startup")
    async def startup_event() -> None:
        await run_startup_db_check()

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ecommerce_agent.server:app", host="127.0.0.1", port=8000, reload=True)
