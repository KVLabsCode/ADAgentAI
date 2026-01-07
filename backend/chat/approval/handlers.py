"""Approval handlers - managing pending approvals and pre-approvals."""

import json
import uuid
import asyncio
import tempfile
from pathlib import Path
from threading import Lock
from typing import Optional

from .models import PendingApproval

# File-based storage paths
_TEMP_DIR = Path(tempfile.gettempdir())
_STREAM_HANDLING_FILE = _TEMP_DIR / "adagent_stream_handling.json"
_PRE_APPROVED_FILE = _TEMP_DIR / "adagent_pre_approved.json"
_BLOCKED_TOOLS_FILE = _TEMP_DIR / "adagent_blocked_tools.json"

# In-memory storage for pending approvals (with thread lock)
_pending_approvals: dict[str, PendingApproval] = {}
_approval_lock = Lock()


# =============================================================================
# File I/O Helpers
# =============================================================================

def _read_json_file(filepath: Path, default=None):
    """Read JSON from file, return default if not exists."""
    try:
        if filepath.exists():
            return json.loads(filepath.read_text())
        return default if default is not None else {}
    except Exception:
        return default if default is not None else {}


def _write_json_file(filepath: Path, data):
    """Write JSON to file."""
    try:
        filepath.write_text(json.dumps(data))
    except Exception as e:
        print(f"  [FILE ERROR] Failed to write {filepath}: {e}")


# =============================================================================
# Pending Approval Management
# =============================================================================

def create_pending_approval(tool_name: str, tool_input: str) -> str:
    """Create a new pending approval and return its ID."""
    approval_id = str(uuid.uuid4())[:8]
    with _approval_lock:
        _pending_approvals[approval_id] = PendingApproval(
            tool_name=tool_name,
            tool_input=tool_input
        )
    return approval_id


def resolve_approval(approval_id: str, approved: bool) -> bool:
    """Resolve a pending approval. Returns True if found and resolved."""
    with _approval_lock:
        if approval_id in _pending_approvals:
            approval = _pending_approvals[approval_id]
            approval.approved = approved
            approval.event.set()  # Unblock the waiting hook
            return True
    return False


def wait_for_approval_sync(approval_id: str, timeout: float = 120.0) -> Optional[bool]:
    """Synchronously wait for approval (for use in hooks).

    Returns: True if approved, False if denied, None if timeout.
    """
    with _approval_lock:
        approval = _pending_approvals.get(approval_id)

    if not approval:
        return None

    # Block until approval or timeout
    got_response = approval.event.wait(timeout=timeout)

    # Clean up
    with _approval_lock:
        _pending_approvals.pop(approval_id, None)

    if not got_response:
        return None  # Timeout

    return approval.approved


async def wait_for_approval_async(approval_id: str, timeout: float = 120.0) -> Optional[bool]:
    """Asynchronously wait for approval (for use in async streaming).

    Returns: True if approved, False if denied, None if timeout.
    """
    with _approval_lock:
        approval = _pending_approvals.get(approval_id)

    if not approval:
        return None

    # Poll the event with async sleep instead of blocking
    start_time = asyncio.get_event_loop().time()
    while True:
        if approval.event.is_set():
            break
        elapsed = asyncio.get_event_loop().time() - start_time
        if elapsed >= timeout:
            break
        await asyncio.sleep(0.1)

    # Clean up
    with _approval_lock:
        _pending_approvals.pop(approval_id, None)

    if not approval.event.is_set():
        return None  # Timeout

    return approval.approved


def get_pending_approval(approval_id: str) -> Optional[PendingApproval]:
    """Get a pending approval by ID."""
    with _approval_lock:
        return _pending_approvals.get(approval_id)


def has_pending_approvals() -> bool:
    """Check if there are any pending approvals."""
    with _approval_lock:
        return len(_pending_approvals) > 0


def poll_approval_status(approval_id: str) -> Optional[bool]:
    """Non-blocking check if approval was resolved.

    Returns: True if approved, False if denied, None if still pending.
    """
    with _approval_lock:
        approval = _pending_approvals.get(approval_id)
        if not approval:
            return None  # Not found (cleaned up or never existed)
        if approval.event.is_set():
            # Resolved - clean up and return result
            _pending_approvals.pop(approval_id, None)
            return approval.approved
        return None  # Still pending


# =============================================================================
# Pre-Approval Management (for stream-handled approvals)
# =============================================================================

def add_pre_approved_tool(tool_name: str) -> None:
    """Mark a tool as pre-approved (approval handled during streaming)."""
    data = _read_json_file(_PRE_APPROVED_FILE, [])
    if tool_name not in data:
        data.append(tool_name)
        _write_json_file(_PRE_APPROVED_FILE, data)
    print(f"  [PRE-APPROVE] Added: {tool_name}")


def check_and_consume_pre_approval(tool_name: str) -> bool:
    """Check if tool was pre-approved. If so, consume and return True."""
    data = _read_json_file(_PRE_APPROVED_FILE, [])
    if tool_name in data:
        data.remove(tool_name)
        _write_json_file(_PRE_APPROVED_FILE, data)
        print(f"  [PRE-APPROVE] Consumed: {tool_name}")
        return True
    return False


def clear_pre_approved_tools() -> None:
    """Clear all pre-approved tools (call at start of new request)."""
    _write_json_file(_PRE_APPROVED_FILE, [])


# =============================================================================
# Stream Handling Markers (coordinate between stream and hook)
# =============================================================================

def mark_stream_handling_approval(tool_name: str, approval_id: str) -> None:
    """Mark that the stream is handling approval for this tool."""
    data = _read_json_file(_STREAM_HANDLING_FILE, {})
    data[tool_name] = approval_id
    _write_json_file(_STREAM_HANDLING_FILE, data)
    print(f"  [STREAM-HANDLE] Marked: {tool_name} -> {approval_id}")


def get_stream_handling_approval(tool_name: str) -> Optional[str]:
    """Get the approval_id if stream is handling approval for this tool."""
    data = _read_json_file(_STREAM_HANDLING_FILE, {})
    result = data.get(tool_name)
    print(f"  [STREAM-HANDLE] Check: {tool_name} -> {result}")
    return result


def clear_stream_handling_approval(tool_name: str) -> None:
    """Clear the stream handling marker for a tool."""
    data = _read_json_file(_STREAM_HANDLING_FILE, {})
    data.pop(tool_name, None)
    _write_json_file(_STREAM_HANDLING_FILE, data)
    print(f"  [STREAM-HANDLE] Cleared: {tool_name}")


# =============================================================================
# Blocked Tools Cache (prevent execution after denial)
# =============================================================================

def add_blocked_tool(tool_name: str, reason: str = "User denied") -> None:
    """Mark a tool as blocked (user denied execution)."""
    data = _read_json_file(_BLOCKED_TOOLS_FILE, {})
    data[tool_name] = reason
    _write_json_file(_BLOCKED_TOOLS_FILE, data)
    print(f"  [BLOCKED] Added: {tool_name} ({reason})")


def is_tool_blocked(tool_name: str) -> tuple[bool, str]:
    """Check if a tool is blocked. Returns (is_blocked, reason)."""
    data = _read_json_file(_BLOCKED_TOOLS_FILE, {})
    if tool_name in data:
        return True, data[tool_name]
    return False, ""


def clear_blocked_tools() -> None:
    """Clear all blocked tools (call at start of new request)."""
    _write_json_file(_BLOCKED_TOOLS_FILE, {})
    print(f"  [BLOCKED] Cleared all blocked tools")


# =============================================================================
# Cleanup
# =============================================================================

def cleanup_approval_files() -> None:
    """Clean up stale approval files from previous runs."""
    for filepath in [_STREAM_HANDLING_FILE, _PRE_APPROVED_FILE, _BLOCKED_TOOLS_FILE]:
        try:
            if filepath.exists():
                filepath.unlink()
                print(f"  Cleaned up: {filepath}")
        except Exception as e:
            print(f"  Warning: couldn't clean {filepath}: {e}")
