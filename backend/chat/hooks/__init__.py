"""CrewAI hooks for tool calls and LLM reasoning."""

from .tool_hooks import (
    register_hooks as register_tool_hooks,
    parse_tool_result,
    capture_tool_call,
    capture_tool_result,
)

from .llm_hooks import (
    register_llm_hooks,
    capture_thinking,
)


def register_hooks():
    """Register all CrewAI hooks (tool + LLM)."""
    register_tool_hooks()
    register_llm_hooks()


__all__ = [
    "register_hooks",
    "register_tool_hooks",
    "register_llm_hooks",
    "parse_tool_result",
    "capture_tool_call",
    "capture_tool_result",
    "capture_thinking",
]
