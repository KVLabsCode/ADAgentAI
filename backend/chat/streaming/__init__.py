"""Streaming module - SSE events and stream management."""

from .events import (
    EventType,
    RoutingEvent,
    AgentEvent,
    ThinkingEvent,
    ResultEvent,
    ErrorEvent,
    DoneEvent,
    ToolApprovalRequiredEvent,
    ToolDeniedEvent,
    format_sse,
)

from .state import (
    is_streaming_active,
    start_stream,
    end_stream,
    push_event,
    get_event_queue,
    clear_event_queue,
    cleanup_state_files,
)

from .processor import stream_chat_response

__all__ = [
    # Events
    "EventType",
    "RoutingEvent",
    "AgentEvent",
    "ThinkingEvent",
    "ResultEvent",
    "ErrorEvent",
    "DoneEvent",
    "ToolApprovalRequiredEvent",
    "ToolDeniedEvent",
    "format_sse",
    # State
    "is_streaming_active",
    "start_stream",
    "end_stream",
    "push_event",
    "get_event_queue",
    "clear_event_queue",
    "cleanup_state_files",
    # Processor
    "stream_chat_response",
]
