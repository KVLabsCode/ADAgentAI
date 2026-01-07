"""CrewAI tool hooks for capturing tool calls and results.

These hooks intercept tool execution to:
1. Capture tool calls and emit events to the frontend
2. Handle dangerous tool approval (block until user approves)
3. Capture tool results for display

IMPORTANT: CrewAI now runs in a background thread (see processor.py).
This means hooks CAN safely block - the main asyncio event loop will
continue draining the queue and sending events to the frontend.

BLOCKING MECHANISM: Per CrewAI docs, returning False from @before_tool_call
blocks tool execution. Returning None allows it to proceed.
"""

import json
import time
import threading

from crewai.hooks import before_tool_call, after_tool_call

from ..approval.models import is_dangerous_tool, get_mcp_tool_name
from ..approval.handlers import (
    create_pending_approval,
    check_and_consume_pre_approval,
    get_stream_handling_approval,
    clear_stream_handling_approval,
    wait_for_approval_sync,
    add_blocked_tool,
)
from ..streaming.state import is_streaming_active, push_event
from ..streaming.events import ToolApprovalRequiredEvent, ToolDeniedEvent


def register_hooks():
    """Explicit function to ensure hooks are registered.

    Note: CrewAI hooks are registered at import time via decorators.
    This function exists for explicit initialization if needed.
    """
    print("[STARTUP] CrewAI tool hooks registered (capture_tool_call, capture_tool_result)")


def _block_tool(tool_name: str, reason: str):
    """Block a tool by both its display name and MCP internal name."""
    add_blocked_tool(tool_name, reason)
    # Also block the MCP internal name if there's a mapping
    mcp_name = get_mcp_tool_name(tool_name)
    if mcp_name:
        add_blocked_tool(mcp_name, reason)
        print(f"  [BLOCKED] Also blocking MCP name: {mcp_name}")


@before_tool_call
def capture_tool_call(context):
    """Capture tool call and send to UI.

    For dangerous tools (write/delete operations), this hook:
    1. First checks if approval was already handled during streaming (pre-approved)
    2. If not pre-approved, emits an approval_required event and blocks
    3. Returns False to deny if user rejects, None to proceed if approved
    """
    thread_id = threading.current_thread().name
    is_active = is_streaming_active()
    print(f"  [HOOK] capture_tool_call triggered! thread={thread_id}, streaming_active={is_active}", flush=True)

    # Debug: show all context attributes
    print(f"  [HOOK-DEBUG] context attrs: {[a for a in dir(context) if not a.startswith('_')]}", flush=True)

    tool_name = context.tool_name
    tool_input = str(context.tool_input) if context.tool_input else ""

    print(f"  [HOOK] Tool: {tool_name} -> dangerous={is_dangerous_tool(tool_name)}", flush=True)

    # For dangerous tools, wait a bit if streaming isn't active yet (race condition)
    if is_dangerous_tool(tool_name) and not is_active:
        print(f"  [HOOK] Waiting for stream to become active...", flush=True)
        for _ in range(20):  # Wait up to 2 seconds
            time.sleep(0.1)
            if is_streaming_active():
                is_active = True
                print(f"  [HOOK] Stream became active!", flush=True)
                break
        if not is_active:
            print(f"  [HOOK] Stream never became active, blocking dangerous tool", flush=True)

    # Check if this is a dangerous tool that needs approval
    if is_dangerous_tool(tool_name):
        # First check if approval was already handled during streaming
        if check_and_consume_pre_approval(tool_name):
            print(f"  [HOOK] Pre-approved, proceeding: {tool_name}")
            _emit_tool_event(tool_name, tool_input, approved=True)
            return None  # Proceed with tool execution

        # Check if stream is already handling approval for this tool
        existing_approval_id = get_stream_handling_approval(tool_name)
        print(f"  [HOOK] Stream handling check: tool={tool_name!r}, found={existing_approval_id}")

        if existing_approval_id:
            print(f"  [HOOK] Stream handling approval, waiting for result: {tool_name} (ID: {existing_approval_id})")
            return _wait_for_stream_approval(tool_name, tool_input, context)

        # Not pre-approved and stream not handling - fallback to hook-based approval
        return _request_hook_approval(tool_name, tool_input, context)

    # Non-dangerous tool - emit event and proceed
    _emit_tool_event(tool_name, tool_input)
    return None


def _emit_tool_event(tool_name: str, tool_input: str, approved: bool = False):
    """Emit a tool execution event to the frontend."""
    is_truncated = len(tool_input) > 200
    tool_event = {
        'type': 'tool',
        'tool': tool_name,
        'input_preview': tool_input[:200],
        'input_full': tool_input if is_truncated else None,
        'is_truncated': is_truncated,
    }
    if approved:
        tool_event['approved'] = True
    push_event(tool_event)


def _wait_for_stream_approval(tool_name: str, tool_input: str, context):
    """Wait for approval that's being handled by the stream."""
    start_time = time.time()
    timeout = 130.0  # Slightly longer than stream's 120s timeout

    while True:
        # Check if approved
        if check_and_consume_pre_approval(tool_name):
            print(f"  [HOOK] Stream approved: {tool_name}")
            clear_stream_handling_approval(tool_name)
            _emit_tool_event(tool_name, tool_input, approved=True)
            return None  # Proceed

        # Check if stream stopped handling (denied or timeout)
        if not get_stream_handling_approval(tool_name):
            print(f"  [HOOK] Stream denied/timeout: {tool_name}")
            print(f"  [HOOK] *** BLOCKING {tool_name} ***", flush=True)
            _block_tool(tool_name, "User denied")
            blocked_msg = f"TOOL BLOCKED: The user explicitly DENIED permission to execute '{tool_name}'. This is NOT a technical error - the user chose to block this action. Do not retry this tool."
            context.tool_result = blocked_msg
            return blocked_msg

        # Timeout check
        if time.time() - start_time > timeout:
            print(f"  [HOOK] Timeout waiting for stream approval: {tool_name}")
            print(f"  [HOOK] *** BLOCKING {tool_name} (timeout) ***", flush=True)
            _block_tool(tool_name, "Approval timeout")
            blocked_msg = f"TOOL BLOCKED: Approval for '{tool_name}' timed out. The user did not respond within 2 minutes. Do not retry this tool."
            context.tool_result = blocked_msg
            return blocked_msg

        time.sleep(0.2)  # Poll every 200ms


def _request_hook_approval(tool_name: str, tool_input: str, context):
    """Request approval via the hook (fallback when stream isn't handling it)."""
    # Create pending approval
    approval_id = create_pending_approval(tool_name, tool_input)

    # Emit approval_required event to frontend
    approval_event = ToolApprovalRequiredEvent(
        approval_id=approval_id,
        tool_name=tool_name,
        tool_input=tool_input[:500]  # Truncate for display
    )
    pushed = push_event(approval_event.model_dump(mode='json'))

    if not pushed:
        print(f"  [APPROVAL] Stream ended, cannot request approval: {tool_name}")
        raise Exception(f"TOOL BLOCKED: Cannot execute '{tool_name}' - streaming session ended. Try again in a new conversation.")

    print(f"  [APPROVAL] Waiting for approval: {tool_name} (ID: {approval_id})")

    # Block and wait for approval (timeout: 2 minutes)
    approved = wait_for_approval_sync(approval_id, timeout=120.0)

    if approved is None:
        print(f"  [APPROVAL] Timeout waiting for approval: {tool_name}")
        push_event(ToolDeniedEvent(
            tool_name=tool_name,
            reason="Approval timed out (2 minutes)"
        ).model_dump(mode='json'))
        print(f"  [APPROVAL] *** BLOCKING {tool_name} (timeout) ***", flush=True)
        _block_tool(tool_name, "Approval timeout")
        # Set tool_result directly on context - this becomes the tool's output
        blocked_msg = f"TOOL BLOCKED: The user did not respond to the approval request for '{tool_name}' within 2 minutes. The tool was NOT executed. Do not retry this tool."
        context.tool_result = blocked_msg
        return blocked_msg

    if not approved:
        print(f"  [APPROVAL] User denied: {tool_name}")
        push_event(ToolDeniedEvent(
            tool_name=tool_name,
            reason="User denied tool execution"
        ).model_dump(mode='json'))
        print(f"  [APPROVAL] *** BLOCKING {tool_name} (denied) ***", flush=True)
        _block_tool(tool_name, "User denied")
        # Set tool_result directly on context - this becomes the tool's output
        blocked_msg = f"TOOL BLOCKED: The user explicitly DENIED permission to execute '{tool_name}'. This is NOT a technical error or permissions issue - the user chose to block this action. Do not retry this tool."
        context.tool_result = blocked_msg
        return blocked_msg

    print(f"  [APPROVAL] User approved: {tool_name}")
    _emit_tool_event(tool_name, tool_input, approved=True)
    return None  # Proceed with tool execution


@after_tool_call
def capture_tool_result(context):
    """Capture tool results and send to UI immediately."""
    if context.tool_result:
        result_event = parse_tool_result(context.tool_result)
        push_event(result_event)
    return None


def parse_tool_result(result_str) -> dict:
    """Parse tool result and return formatted event."""
    try:
        result_data = json.loads(result_str)
        full_json = json.dumps(result_data, indent=2)

        if isinstance(result_data, dict):
            preview = json.dumps(result_data, indent=2)[:500]
            is_truncated = len(full_json) > 500
            return {
                'type': 'tool_result',
                'preview': preview,
                'full': full_json if is_truncated else None,
                'data_type': 'json',
                'is_truncated': is_truncated
            }
        elif isinstance(result_data, list):
            preview = json.dumps(result_data[:3], indent=2)
            is_truncated = len(result_data) > 3
            return {
                'type': 'tool_result',
                'preview': preview,
                'full': full_json if is_truncated else None,
                'data_type': 'json_list',
                'item_count': len(result_data),
                'is_truncated': is_truncated
            }
        else:
            return {
                'type': 'tool_result',
                'preview': full_json,
                'full': None,
                'data_type': 'json',
                'is_truncated': False
            }
    except (json.JSONDecodeError, TypeError):
        result_str = str(result_str)
        is_truncated = len(result_str) > 300
        preview = result_str[:300] if is_truncated else result_str
        return {
            'type': 'tool_result',
            'preview': preview,
            'full': result_str if is_truncated else None,
            'data_type': 'text',
            'is_truncated': is_truncated
        }
