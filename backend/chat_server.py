"""
FastAPI Streaming Chat Server for Ad Platform.

Uses modular chat/ package for:
- LangGraph streaming with state persistence
- SSE output to frontend
- Query routing to specialists
- Dangerous tool approval workflow with interrupt()
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Windows: Configure for psycopg async compatibility
# Must be done BEFORE any async imports
if sys.platform == "win32":
    # Force UTF-8 encoding
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

    # psycopg requires SelectorEventLoop on Windows (ProactorEventLoop not supported)
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Load environment variables from consolidated backend/.env
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    # Fallback to api/.env for backwards compatibility
    api_env_path = Path(__file__).parent / "api" / ".env"
    if api_env_path.exists():
        load_dotenv(api_env_path)

# Note: Model configuration is handled in the LangGraph nodes
# Router uses Claude Haiku, specialists use the user's selected model

# Add project to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional

# Import from modular chat package
from chat import (
    stream_chat_response,
    stream_resume_response,
    cleanup_state_files,
    resolve_approval,
    cleanup_approval_files,
    validate_user_session,
)
from chat.approval.handlers import get_pending_approval
from chat.approval.models import PendingApproval
from chat.streaming.state import get_pending_result, consume_pending_result, cleanup_old_pending_results
from threading import Lock

# Configuration
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Store for pending approvals (shared with handlers via import)
_approval_lock = Lock()


# =============================================================================
# FastAPI Application
# =============================================================================

def _cleanup_all_state():
    """Clean up all stale state files."""
    cleanup_state_files()
    cleanup_approval_files()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("\n  Starting Ad Platform Chat Server (modular)...")
    _cleanup_all_state()
    print(f"  Chat endpoint: /chat/stream")
    print(f"  Health check: /health")
    yield
    print("\n  Shutting down...")
    _cleanup_all_state()


app = FastAPI(
    title="Ad Platform Chat API",
    description="SSE streaming chat with LangGraph agents",
    version="4.0.0",
    lifespan=lifespan
)

# CORS middleware
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:3002",
    "https://adagentai.com",
    "https://www.adagentai.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://adagent-ai.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Request/Response Models
# =============================================================================

class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    message: str
    user_id: Optional[str] = None
    organization_id: Optional[str] = None  # Better Auth org ID for org-scoped operations
    history: Optional[list] = None
    context: Optional[dict] = None


class ToolApprovalRequest(BaseModel):
    """Request body for tool approval endpoint."""
    approval_id: str
    approved: bool
    modified_params: Optional[dict] = None  # User-modified parameters


class DynamicFieldRequest(BaseModel):
    """Request body for fetching dynamic field options."""
    field_type: str  # accounts, apps, ad_units, ad_sources, mediation_groups
    account_id: Optional[str] = None  # Required for dependent fields


# =============================================================================
# Endpoints
# =============================================================================

@app.post("/chat/stream")
async def chat_stream(request: Request, body: ChatRequest):
    """Stream chat responses via SSE with LangGraph agents."""

    # Validate session
    user_id = await validate_user_session(request)
    if not user_id:
        return JSONResponse(
            status_code=401,
            content={"error": "Unauthorized - please log in"}
        )

    # Extract organization ID from request body or header
    organization_id = body.organization_id or request.headers.get("x-organization-id")

    # Extract context settings
    selected_model = None
    context_mode = "soft"  # Default
    enabled_accounts = []  # Empty = all enabled
    if body.context and isinstance(body.context, dict):
        selected_model = body.context.get("selectedModel")
        context_mode = body.context.get("contextMode", "soft")
        enabled_accounts = body.context.get("enabledProviderIds", [])

    return StreamingResponse(
        stream_chat_response(
            user_query=body.message,
            user_id=user_id,
            organization_id=organization_id,
            conversation_history=body.history,
            selected_model=selected_model,
            context_mode=context_mode,
            enabled_accounts=enabled_accounts,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/chat/approve-tool")
async def approve_tool(body: ToolApprovalRequest):
    """Handle tool approval/denial from the frontend."""
    success = resolve_approval(body.approval_id, body.approved, body.modified_params)

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Approval ID not found or already resolved: {body.approval_id}"
        )

    return {
        "success": True,
        "approval_id": body.approval_id,
        "approved": body.approved,
        "has_modifications": body.modified_params is not None
    }


@app.post("/chat/field-options")
async def get_field_options(request: Request, body: DynamicFieldRequest):
    """Fetch dynamic field options based on field type and user context."""
    from chat.utils.providers import get_user_providers
    import httpx

    API_URL = os.environ.get("API_URL", "http://localhost:3001")
    INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

    # Try to validate session, but don't fail if it doesn't work
    user_id = await validate_user_session(request)
    organization_id = request.headers.get("x-organization-id")

    # If no user_id, return empty options with manual input fallback
    if not user_id:
        return {"options": [], "manual_input": True}

    # Fetch options based on field type
    if body.field_type == "accounts":
        # Get connected AdMob providers
        providers = await get_user_providers(user_id, organization_id)
        admob_providers = [p for p in providers if p.get("type") == "admob"]
        return {
            "options": [
                {
                    "value": p.get("identifier", ""),
                    "label": p.get("name", p.get("identifier", "Unknown Account")),
                    "id": p.get("id"),  # Include provider ID for dependent field fetching
                }
                for p in admob_providers
            ]
        }

    # For dependent fields, call internal API endpoints
    if body.field_type in ("apps", "ad_units", "mediation_groups"):
        if not body.account_id:
            return {"options": [], "manual_input": True}

        # First, find the provider ID for this account
        providers = await get_user_providers(user_id, organization_id)
        provider = next(
            (p for p in providers if p.get("identifier") == body.account_id),
            None
        )
        if not provider or not provider.get("id"):
            return {"options": [], "manual_input": True}

        provider_id = provider["id"]

        # Map field type to endpoint
        endpoint_map = {
            "apps": "/api/providers/internal/apps",
            "ad_units": "/api/providers/internal/ad-units",
            "mediation_groups": "/api/providers/internal/mediation-groups",
        }
        endpoint = endpoint_map.get(body.field_type)

        if not endpoint or not INTERNAL_API_KEY:
            return {"options": [], "manual_input": True}

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(
                    f"{API_URL}{endpoint}",
                    params={"providerId": provider_id},
                    headers={"x-internal-api-key": INTERNAL_API_KEY},
                )
                if response.status_code == 200:
                    data = response.json()
                    # Response keys: apps, adUnits, or mediationGroups
                    key = body.field_type.replace("_", "") if body.field_type != "ad_units" else "adUnits"
                    items = data.get(key, [])
                    return {"options": items}
        except Exception as e:
            print(f"[field-options] Error fetching {body.field_type}: {e}")

    return {"options": [], "manual_input": True}


@app.get("/chat/pending-approvals")
async def get_pending_approvals_list():
    """Debug endpoint to list all pending approvals."""
    from chat.approval.handlers import _pending_approvals, _approval_lock
    with _approval_lock:
        return {
            "pending": [
                {
                    "id": aid,
                    "tool": approval.tool_name,
                    "created_at": approval.created_at.isoformat(),
                }
                for aid, approval in _pending_approvals.items()
            ]
        }


@app.get("/chat/result/{stream_id}")
async def get_stream_result(stream_id: str):
    """
    Fetch pending result for a stream that ended but graph was still running.
    Used when user navigates away during approval and comes back later.

    Returns:
    - 200 with result if available and done
    - 202 if still processing (not done yet)
    - 404 if stream not found or expired
    """
    # Clean up old pending results first
    cleanup_old_pending_results(900.0)  # 15 minutes

    result = get_pending_result(stream_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Stream result not found or expired"
        )

    if not result.get("done"):
        # Still processing - return 202 Accepted
        return JSONResponse(
            status_code=202,
            content={
                "status": "processing",
                "stream_id": stream_id,
                "events": result.get("events", []),
            }
        )

    # Done - return full result and consume (remove from store)
    full_result = consume_pending_result(stream_id)
    if not full_result:
        # Race condition - another request consumed it
        raise HTTPException(status_code=404, detail="Result already consumed")

    return {
        "status": "done",
        "stream_id": stream_id,
        "result": full_result.get("result"),
        "error": full_result.get("error"),
        "events": full_result.get("events", []),
    }


@app.get("/")
@app.head("/")
@app.get("/health")
@app.head("/health")
async def health_check():
    """Health check endpoint (also serves root for Render probes)."""
    return {"status": "ok", "service": "ad-platform-chat", "version": "4.0.0"}


@app.get("/chat/prompts")
async def get_prompts():
    """Return all agent prompts for admin viewing."""
    from chat.graph.nodes.router import ROUTER_SYSTEM_PROMPT, ROUTE_MAP
    from chat.graph.nodes.specialist import SERVICE_INSTRUCTIONS, AGENT_ROLES
    from chat.graph.nodes.entity_loader import build_entity_system_prompt

    # Build example entity prompt with sample data
    sample_context = {
        "accounts": [
            {"id": "acc-1", "name": "My AdMob Account", "type": "admob", "identifier": "pub-123456789"},
            {"id": "net-1", "name": "My GAM Network", "type": "gam", "identifier": "12345678"},
        ],
        "apps": [
            {"id": "app-1", "name": "My App", "platform": "ANDROID", "account_id": "acc-1"},
        ],
        "context_mode": "soft",
        "enabled_accounts": [],
    }
    entity_grounding_example = build_entity_system_prompt(sample_context)

    return {
        "prompts": [
            {
                "id": "router",
                "title": "Query Router",
                "description": "Classifies user queries to route to the appropriate specialist agent",
                "content": ROUTER_SYSTEM_PROMPT,
                "version": "1.0.0",
                "lastUpdated": "2026-01-10",
                "metadata": {
                    "routeMap": ROUTE_MAP,
                },
            },
            {
                "id": "admob_specialist",
                "title": "AdMob Specialist",
                "description": "Instructions for AdMob-related operations",
                "content": SERVICE_INSTRUCTIONS.get("admob", ""),
                "version": "1.0.0",
                "lastUpdated": "2026-01-10",
                "metadata": {
                    "roles": {
                        k[1]: v for k, v in AGENT_ROLES.items() if k[0] == "admob"
                    },
                },
            },
            {
                "id": "admanager_specialist",
                "title": "Ad Manager Specialist",
                "description": "Instructions for Google Ad Manager operations",
                "content": SERVICE_INSTRUCTIONS.get("admanager", ""),
                "version": "1.0.0",
                "lastUpdated": "2026-01-10",
                "metadata": {
                    "roles": {
                        k[1]: v for k, v in AGENT_ROLES.items() if k[0] == "admanager"
                    },
                },
            },
            {
                "id": "general_assistant",
                "title": "General Assistant",
                "description": "Fallback assistant for general queries",
                "content": SERVICE_INSTRUCTIONS.get("general", ""),
                "version": "1.0.0",
                "lastUpdated": "2026-01-10",
                "metadata": {},
            },
            {
                "id": "entity_grounding",
                "title": "Entity Grounding Template",
                "description": "Dynamic template injected into specialist prompts to ground LLM on valid entities",
                "content": entity_grounding_example,
                "version": "1.0.0",
                "lastUpdated": "2026-01-10",
                "metadata": {
                    "note": "This is an example with sample data. Actual content is generated per-request based on user's connected accounts.",
                },
            },
        ]
    }


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    import asyncio

    port = int(os.environ.get("AGENT_PORT", 5000))
    print(f"\n  Ad Platform Chat API (modular) -> http://localhost:{port}\n")

    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
    server = uvicorn.Server(config)

    # Windows: uvicorn 0.36.0+ ignores WindowsSelectorEventLoopPolicy when using run()
    # Fix: Use asyncio.run() with explicit loop_factory to force SelectorEventLoop
    # See: https://github.com/Kludex/uvicorn/discussions/2749
    if sys.platform == "win32":
        import selectors
        asyncio.run(
            server.serve(),
            loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector())
        )
    else:
        asyncio.run(server.serve())
