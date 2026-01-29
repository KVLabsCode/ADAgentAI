"""
FastAPI Streaming Chat Server for Ad Platform.

Uses modular chat/ package for:
- LangGraph streaming with state persistence
- SSE output to frontend
- Query routing to specialists
- Dangerous tool approval workflow with interrupt()
"""

import warnings
# Suppress Pydantic V1 warning from langchain_core on Python 3.14+
# Issue: https://github.com/langchain-ai/langchain/issues/33926 (CLOSED - fix in progress)
# Fix: Pydantic 2.13 will remove this warning. Currently on 2.12.5.
# TODO: Remove this suppression once upgraded to pydantic>=2.13
warnings.filterwarnings("ignore", message="Core Pydantic V1 functionality", category=UserWarning)

import json
import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Windows: Configure UTF-8 encoding for proper Unicode handling
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    # Note: SelectorEventLoop for psycopg compatibility is configured via
    # asyncio.run(loop_factory=...) in the main entry point (avoids deprecated policy API)

# Load environment variables FIRST before any imports from chat package
# This ensures DATABASE_URL is available when chat.graph.builder is imported
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    # Fallback to api/.env for backwards compatibility
    api_env_path = Path(__file__).parent / "api" / ".env"
    if api_env_path.exists():
        load_dotenv(api_env_path)

# Add project to path BEFORE importing chat package
sys.path.insert(0, str(Path(__file__).parent))

# Note: Model configuration is handled in the LangGraph nodes
# Router uses Claude Haiku, specialists use the user's selected model

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
from chat.approval.handlers import get_pending_approval, create_pending_approval
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
    "https://ad-agent-ai.vercel.app", 
    "https://www.internal.kovio.dev",
    "https://www.dashboard.kovio.dev",
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
    # Filter parameters for cascading dependencies
    platform: Optional[str] = None  # IOS, ANDROID
    ad_format: Optional[str] = None  # BANNER, INTERSTITIAL, REWARDED, etc.
    app_id: Optional[str] = None  # Filter ad units by specific app


class ResumeRequest(BaseModel):
    """Request body for resuming graph after tool approval."""
    stream_id: str
    approved: bool
    modified_params: Optional[dict] = None
    tool_name: Optional[str] = None  # For progress streaming UI


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


@app.post("/chat/resume")
async def resume_stream(request: Request, body: ResumeRequest):
    """Resume a paused graph after tool approval.

    This continues the LangGraph execution from where it was interrupted.
    The frontend should call this after successfully calling /chat/approve-tool.
    """
    print(f"[resume_endpoint] Called with stream_id={body.stream_id}, approved={body.approved}", flush=True)

    # Validate session
    user_id = await validate_user_session(request)
    if not user_id:
        print(f"[resume_endpoint] Unauthorized - no user_id", flush=True)
        return JSONResponse(
            status_code=401,
            content={"error": "Unauthorized - please log in"}
        )

    print(f"[resume_endpoint] User validated: {user_id}, returning StreamingResponse", flush=True)
    return StreamingResponse(
        stream_resume_response(
            stream_id=body.stream_id,
            approved=body.approved,
            modified_params=body.modified_params,
            tool_name=body.tool_name,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


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
    # Support bidding_ad_sources and waterfall_ad_sources as filtered variants of ad_sources
    field_type = body.field_type
    ad_source_filter = None

    if field_type == "bidding_ad_sources":
        field_type = "ad_sources"
        ad_source_filter = "bidding"
    elif field_type == "waterfall_ad_sources":
        field_type = "ad_sources"
        ad_source_filter = "waterfall"

    if field_type in ("apps", "ad_units", "mediation_groups", "ad_sources"):
        print(f"[field-options] Processing {body.field_type} request, account_id={body.account_id}, filter={ad_source_filter}")
        if not body.account_id:
            print(f"[field-options] No account_id provided for {body.field_type}")
            return {"options": [], "manual_input": True}

        # First, find the provider ID for this account
        providers = await get_user_providers(user_id, organization_id)
        provider = next(
            (p for p in providers if p.get("identifier") == body.account_id),
            None
        )
        print(f"[field-options] Found provider for {body.account_id}: {provider.get('id') if provider else None}")
        if not provider or not provider.get("id"):
            print(f"[field-options] Provider not found for {body.account_id}")
            return {"options": [], "manual_input": True}

        provider_id = provider["id"]

        # Map field type to endpoint
        endpoint_map = {
            "apps": "/api/providers/internal/apps",
            "ad_units": "/api/providers/internal/ad-units",
            "mediation_groups": "/api/providers/internal/mediation-groups",
            "ad_sources": "/api/providers/internal/ad-sources",
        }
        endpoint = endpoint_map.get(field_type)

        if not endpoint or not INTERNAL_API_KEY:
            print(f"[field-options] Missing endpoint or API key")
            return {"options": [], "manual_input": True}

        try:
            # Build query params with filters
            params = {"providerId": provider_id}
            if body.platform:
                params["platform"] = body.platform
            if body.ad_format:
                params["adFormat"] = body.ad_format
            if body.app_id:
                params["appId"] = body.app_id

            print(f"[field-options] Calling {API_URL}{endpoint} with params={params}")
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(
                    f"{API_URL}{endpoint}",
                    params=params,
                    headers={"x-internal-api-key": INTERNAL_API_KEY},
                )
                print(f"[field-options] Response status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"[field-options] Response data keys: {data.keys()}")
                    # Map field_type to response keys
                    response_key_map = {
                        "apps": "apps",
                        "ad_units": "adUnits",
                        "mediation_groups": "mediationGroups",
                        "ad_sources": "adSources",
                    }
                    key = response_key_map.get(field_type, field_type)
                    items = data.get(key, [])

                    # Filter ad sources by type if requested
                    # AdMob API ad sources follow a naming convention:
                    # - "(bidding)" suffix = bidding-only variant (e.g., "Meta Audience Network (bidding)")
                    # - No suffix = waterfall variant (e.g., "Meta Audience Network")
                    # - Special: "AdMob Network" is bidding (no suffix), "AdMob Network Waterfall" is waterfall
                    #
                    # Source: https://developers.google.com/admob/api/v1/ad-sources-reference
                    #
                    # Import coming soon helper functions
                    from chat.constants import is_coming_soon_bidding, is_coming_soon_waterfall

                    if ad_source_filter and key == "adSources":
                        print(f"[field-options] Filtering ad sources: filter={ad_source_filter}, total={len(items)}")
                        before_count = len(items)
                        filtered_items = []

                        if ad_source_filter == "bidding":
                            for item in items:
                                # API returns "title", not "label"
                                title = item.get("title", item.get("label", ""))
                                title_lower = title.lower()
                                # Include if has "(bidding)" OR is exactly "AdMob Network" (special case)
                                is_admob_bidding = title_lower == "admob network"
                                has_bidding_suffix = "(bidding)" in title_lower

                                if is_admob_bidding or has_bidding_suffix:
                                    # Check if coming soon (whitelist approach)
                                    if is_coming_soon_bidding(title):
                                        print(f"[field-options] Marking as coming soon: {title}")
                                        item = {**item, "disabled": True, "comingSoon": True}
                                    filtered_items.append(item)
                            items = filtered_items
                            # Count disabled items
                            disabled_count = sum(1 for i in items if i.get("disabled"))
                            print(f"[field-options] Bidding filter: {before_count} -> {len(items)} items ({disabled_count} disabled)")

                        elif ad_source_filter == "waterfall":
                            for item in items:
                                # API returns "title", not "label"
                                title = item.get("title", item.get("label", ""))
                                title_lower = title.lower()
                                # Exclude bidding variants (has "(bidding)") but NOT "AdMob Network" (that's bidding-only)
                                is_admob_bidding = title_lower == "admob network"
                                has_bidding_suffix = "(bidding)" in title_lower

                                if not has_bidding_suffix and not is_admob_bidding:
                                    # Check if coming soon (all waterfall supported currently)
                                    if is_coming_soon_waterfall(title):
                                        print(f"[field-options] Marking as coming soon: {title}")
                                        item = {**item, "disabled": True, "comingSoon": True}
                                    filtered_items.append(item)
                            items = filtered_items
                            # Count disabled items
                            disabled_count = sum(1 for i in items if i.get("disabled"))
                            print(f"[field-options] Waterfall filter: {before_count} -> {len(items)} items ({disabled_count} disabled)")

                    print(f"[field-options] Returning {len(items)} items for {body.field_type}")
                    return {"options": items}
                else:
                    print(f"[field-options] Non-200 response: {response.text}")
        except Exception as e:
            print(f"[field-options] Error fetching {body.field_type}: {e}")

    return {"options": [], "manual_input": True}


@app.get("/chat/pending-approvals")
async def get_pending_approvals_list():
    """Debug endpoint to list all pending approvals."""
    from chat.approval.handlers import _get_all_approvals
    approvals = _get_all_approvals()
    return {
        "pending": [
            {
                "id": aid,
                "tool": data.get("tool_name", "unknown"),
                "created_at": data.get("created_at", 0),
            }
            for aid, data in approvals.items()
        ]
    }


class TestSeedApprovalRequest(BaseModel):
    """Request body for test seed approval endpoint."""
    tool_name: str = "admob_create_ad_unit"
    tool_input: Optional[dict] = None


@app.post("/test/seed-approval")
async def seed_approval(body: TestSeedApprovalRequest):
    """Test-only: Create a pending approval for E2E testing.

    This endpoint is only available when E2E_TESTING=true environment variable is set.
    Used by Playwright tests to pre-seed approvals that can then be resolved via
    the real /chat/approve-tool endpoint.
    """
    if not os.environ.get("E2E_TESTING"):
        raise HTTPException(
            status_code=403,
            detail="Only available in test mode (E2E_TESTING=true)"
        )

    # Convert dict to JSON string as expected by create_pending_approval
    tool_input_str = json.dumps(body.tool_input or {"name": "Test Ad Unit"})

    approval_id = create_pending_approval(
        tool_name=body.tool_name,
        tool_input=tool_input_str,
    )

    return {
        "approval_id": approval_id,
        "tool_name": body.tool_name,
        "tool_input": body.tool_input,
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
