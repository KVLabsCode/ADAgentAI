"""
FastAPI Streaming Chat Server for Ad Platform.

Uses modular chat/ package for:
- CrewAI streaming with tool hooks
- SSE output to frontend
- Query routing to specialists
- Dangerous tool approval workflow
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Force UTF-8 encoding for Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Load environment variables
from dotenv import load_dotenv
api_env_path = Path(__file__).parent / "api" / ".env"
if api_env_path.exists():
    load_dotenv(api_env_path)

# Set model before imports
os.environ.setdefault("MODEL", "anthropic/claude-sonnet-4-20250514")

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
    cleanup_state_files,
    resolve_approval,
    cleanup_approval_files,
    register_hooks,
    validate_user_session,
)
from chat.approval.handlers import get_pending_approval
from chat.approval.models import PendingApproval
from threading import Lock

# Register CrewAI hooks at import time
register_hooks()

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
    description="SSE streaming chat with CrewAI agents (modular)",
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


# =============================================================================
# Endpoints
# =============================================================================

@app.post("/chat/stream")
async def chat_stream(request: Request, body: ChatRequest):
    """Stream chat responses via SSE with CrewAI agents."""

    # Validate session
    user_id = await validate_user_session(request)
    if not user_id:
        return JSONResponse(
            status_code=401,
            content={"error": "Unauthorized - please log in"}
        )

    # Extract organization ID from request body or header
    organization_id = body.organization_id or request.headers.get("x-organization-id")

    return StreamingResponse(
        stream_chat_response(
            user_query=body.message,
            user_id=user_id,
            organization_id=organization_id,
            conversation_history=body.history,
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
    success = resolve_approval(body.approval_id, body.approved)

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Approval ID not found or already resolved: {body.approval_id}"
        )

    return {"success": True, "approval_id": body.approval_id, "approved": body.approved}


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


@app.get("/")
@app.head("/")
@app.get("/health")
@app.head("/health")
async def health_check():
    """Health check endpoint (also serves root for Render probes)."""
    return {"status": "ok", "service": "ad-platform-chat", "version": "4.0.0"}


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("AGENT_PORT", 5000))
    print(f"\n  Ad Platform Chat API (modular) -> http://localhost:{port}\n")

    uvicorn.run(
        "chat_server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
