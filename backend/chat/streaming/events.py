"""SSE Event types for chat streaming."""

import json
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class EventType(str, Enum):
    """Event types for SSE streaming."""
    ROUTING = "routing"
    AGENT = "agent"
    THINKING = "thinking"  # Match frontend expected type
    TOOL = "tool"
    TOOL_RESULT = "tool_result"
    TOOL_APPROVAL_REQUIRED = "tool_approval_required"
    TOOL_DENIED = "tool_denied"
    CONTENT = "content"
    RESULT = "result"
    ERROR = "error"
    DONE = "done"


class RoutingEvent(BaseModel):
    """Event sent when query is routed to a specialist."""
    type: str = EventType.ROUTING
    service: str
    capability: str
    thinking: Optional[str] = None


class AgentEvent(BaseModel):
    """Event sent when agent/task changes."""
    type: str = EventType.AGENT
    agent: str
    task: Optional[str] = None


class ThinkingEvent(BaseModel):
    """Event sent for agent thinking/reasoning."""
    type: str = EventType.THINKING
    content: str


class ResultEvent(BaseModel):
    """Event sent for final result."""
    type: str = EventType.RESULT
    content: str


class ErrorEvent(BaseModel):
    """Event sent on error."""
    type: str = EventType.ERROR
    content: str


class DoneEvent(BaseModel):
    """Event sent when stream completes."""
    type: str = EventType.DONE


class ToolApprovalRequiredEvent(BaseModel):
    """Event sent when a dangerous tool requires human approval."""
    type: str = EventType.TOOL_APPROVAL_REQUIRED
    approval_id: str
    tool_name: str
    tool_input: str
    parameter_schema: Optional[dict] = None  # JSON Schema for editable params


class ToolDeniedEvent(BaseModel):
    """Event sent when user denies a tool execution."""
    type: str = EventType.TOOL_DENIED
    tool_name: str
    reason: str = "User denied tool execution"


def format_sse(data: dict) -> str:
    """Format data as SSE event."""
    return f"data: {json.dumps(data)}\n\n"
