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
    get_current_stream_id,
    clear_current_stream,
    create_pending_result,
    add_pending_event,
    set_pending_result,
    get_pending_result,
    consume_pending_result,
    cleanup_old_pending_results,
)

from .processor import stream_chat_response, stream_resume_response

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
    "get_current_stream_id",
    "clear_current_stream",
    # Pending results
    "create_pending_result",
    "add_pending_event",
    "set_pending_result",
    "get_pending_result",
    "consume_pending_result",
    "cleanup_old_pending_results",
    # Processor
    "stream_chat_response",
    "stream_resume_response",
]
