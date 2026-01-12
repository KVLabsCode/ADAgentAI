"""Tool approval system for dangerous operations."""

from .models import PendingApproval, DANGEROUS_TOOLS, is_dangerous_tool, get_tool_display_name
from .handlers import (
    create_pending_approval,
    resolve_approval,
    wait_for_approval_sync,
    wait_for_approval_async,
    get_pending_approval,
    has_pending_approvals,
    add_pre_approved_tool,
    check_and_consume_pre_approval,
    clear_pre_approved_tools,
    mark_stream_handling_approval,
    get_stream_handling_approval,
    clear_stream_handling_approval,
    cleanup_approval_files,
    # Blocked tools
    add_blocked_tool,
    is_tool_blocked,
    clear_blocked_tools,
)

__all__ = [
    # Models
    "PendingApproval",
    "DANGEROUS_TOOLS",
    "is_dangerous_tool",
    "get_tool_display_name",
    # Handlers
    "create_pending_approval",
    "resolve_approval",
    "wait_for_approval_sync",
    "wait_for_approval_async",
    "get_pending_approval",
    "has_pending_approvals",
    "add_pre_approved_tool",
    "check_and_consume_pre_approval",
    "clear_pre_approved_tools",
    "mark_stream_handling_approval",
    "get_stream_handling_approval",
    "clear_stream_handling_approval",
    "cleanup_approval_files",
    # Blocked tools
    "add_blocked_tool",
    "is_tool_blocked",
    "clear_blocked_tools",
]
