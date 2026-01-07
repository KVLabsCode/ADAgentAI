"""
Chat server modules for Ad Platform.

Modular structure:
- streaming/  : SSE events, stream state, main processor
- approval/   : Tool approval system (dangerous tools, human-in-loop)
- routing/    : Query classification and routing
- hooks/      : CrewAI tool hooks
- crew/       : CrewAI crew builder
- utils/      : Helpers (providers, parsing)
"""

# Main exports for convenience
from .streaming import stream_chat_response, cleanup_state_files
from .approval import resolve_approval, cleanup_approval_files
from .hooks import register_hooks
from .utils import validate_user_session

__all__ = [
    "stream_chat_response",
    "cleanup_state_files",
    "resolve_approval",
    "cleanup_approval_files",
    "register_hooks",
    "validate_user_session",
]
