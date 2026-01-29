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
    TOOL_EXECUTING = "tool_executing"  # Tool is currently running (shows spinner)
    TOOL_RESULT = "tool_result"
    TOOL_APPROVAL_REQUIRED = "tool_approval_required"
    TOOL_DENIED = "tool_denied"
    ACTION_REQUIRED = "action_required"  # User action needed (connect provider, etc.)
    TASK_PROGRESS = "task_progress"  # Background task progress update
    TASK_COMPLETE = "task_complete"  # Background task completed
    TASK_ERROR = "task_error"  # Background task failed
    CONTENT = "content"
    RESULT = "result"
    FINISHED = "finished"  # Chain of thought complete
    ERROR = "error"
    DONE = "done"


class ActionType(str, Enum):
    """Types of user actions that may be required."""
    CONNECT_PROVIDER = "connect_provider"  # Need to connect a provider (AdMob/GAM/network)
    UPGRADE_PLAN = "upgrade_plan"  # Feature requires higher plan
    VERIFY_EMAIL = "verify_email"  # Email verification needed
    GRANT_PERMISSIONS = "grant_permissions"  # Additional OAuth scopes needed
    REAUTHENTICATE = "reauthenticate"  # Token expired, need to reconnect


class RoutingEvent(BaseModel):
    """Event sent when query is routed to a specialist."""
    type: str = EventType.ROUTING
    service: str
    capability: str
    thinking: Optional[str] = None
    execution_path: Optional[str] = None  # "reactive" | "workflow"
    model_selected: Optional[str] = None  # Auto-selected model name


class AgentEvent(BaseModel):
    """Event sent when agent/task changes."""
    type: str = EventType.AGENT
    agent: str
    task: Optional[str] = None


class ThinkingEvent(BaseModel):
    """Event sent for agent thinking/reasoning."""
    type: str = EventType.THINKING
    content: str


class ContentEvent(BaseModel):
    """Event sent for streaming content chunks during LLM response."""
    type: str = EventType.CONTENT
    content: str
    is_final: bool = False  # True when this is the last chunk


class ResultEvent(BaseModel):
    """Event sent for final result."""
    type: str = EventType.RESULT
    content: str


class FinishedEvent(BaseModel):
    """Event sent when chain of thought completes successfully."""
    type: str = EventType.FINISHED
    message: str = "Finished"


class ErrorEvent(BaseModel):
    """Event sent on error."""
    type: str = EventType.ERROR
    content: str


class DoneEvent(BaseModel):
    """Event sent when stream completes."""
    type: str = EventType.DONE


class ToolExecutingEvent(BaseModel):
    """Event sent when a tool starts executing (shows spinner in UI)."""
    type: str = EventType.TOOL_EXECUTING
    tool_name: str
    message: str = "Executing..."


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


class ActionRequiredEvent(BaseModel):
    """Event sent when user action is required to proceed.

    Used when the agent cannot complete a request without user intervention,
    such as connecting a provider, upgrading their plan, or reauthenticating.
    """
    type: str = EventType.ACTION_REQUIRED
    action_type: ActionType  # What action is needed
    message: str  # User-friendly message explaining what's needed
    deep_link: Optional[str] = None  # URL to navigate user to (e.g., /providers)
    blocking: bool = True  # If true, agent cannot proceed without this action
    metadata: Optional[dict] = None  # Additional context (provider_type, feature_name, etc.)


class TaskProgressEvent(BaseModel):
    """Event sent for background task progress updates.

    Streams progress for long-running operations like report generation.
    """
    type: str = EventType.TASK_PROGRESS
    task_id: str
    progress: float  # 0.0 to 1.0
    message: str  # Current step description
    estimated_remaining: Optional[float] = None  # Seconds remaining (estimate)


class TaskCompleteEvent(BaseModel):
    """Event sent when a background task completes successfully."""
    type: str = EventType.TASK_COMPLETE
    task_id: str
    message: str = "Task completed"
    result: Optional[dict] = None  # Optional result data


class TaskErrorEvent(BaseModel):
    """Event sent when a background task fails."""
    type: str = EventType.TASK_ERROR
    task_id: str
    error: str
    code: Optional[str] = None  # Error code for programmatic handling
    details: Optional[dict] = None  # Additional error context


def format_sse(data: dict) -> str:
    """Format data as SSE event."""
    return f"data: {json.dumps(data)}\n\n"
