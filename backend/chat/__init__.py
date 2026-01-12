"""
Chat server modules for Ad Platform.

Modular structure (LangGraph-based):
- graph/       : LangGraph StateGraph, nodes, builder
- streaming/   : SSE events, stream state, main processor
- approval/    : Tool approval system (dangerous tools, human-in-loop)
- utils/       : Helpers (providers, parsing)

ARCHITECTURE:
Uses LangGraph with interrupt() for human-in-loop tool approvals.
State persisted via PostgresSaver in Neon Postgres.
"""

# Main exports for convenience
from .streaming import stream_chat_response, stream_resume_response, cleanup_state_files
from .approval import resolve_approval, cleanup_approval_files
from .utils import validate_user_session

__all__ = [
    "stream_chat_response",
    "stream_resume_response",
    "cleanup_state_files",
    "resolve_approval",
    "cleanup_approval_files",
    "validate_user_session",
]
