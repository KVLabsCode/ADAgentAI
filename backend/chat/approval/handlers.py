"""Approval handlers - managing pending approvals and pre-approvals.

Uses file-based storage to share approval state across async contexts.
The API endpoint and LangGraph interrupt handler share state via files.
"""

import json
import time
import uuid
import asyncio
import tempfile
from pathlib import Path
from typing import Optional

# File-based storage paths for cross-module sharing
_TEMP_DIR = Path(tempfile.gettempdir())
_STREAM_HANDLING_FILE = _TEMP_DIR / "adagent_stream_handling.json"
_PRE_APPROVED_FILE = _TEMP_DIR / "adagent_pre_approved.json"
_BLOCKED_TOOLS_FILE = _TEMP_DIR / "adagent_blocked_tools.json"
_PENDING_APPROVALS_FILE = _TEMP_DIR / "adagent_pending_approvals.json"


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
    except Exception:
        pass  # Silently ignore file write errors


# =============================================================================
# Pending Approval Management (File-based for cross-module sharing)
# =============================================================================

def _get_all_approvals() -> dict:
    """Get all pending approvals from file."""
    return _read_json_file(_PENDING_APPROVALS_FILE, {})


def _save_all_approvals(approvals: dict) -> None:
    """Save all pending approvals to file."""
    _write_json_file(_PENDING_APPROVALS_FILE, approvals)


def create_pending_approval(tool_name: str, tool_input: str) -> str:
    """Create a new pending approval and return its ID."""
    approval_id = str(uuid.uuid4())[:8]

    # Store in file (shared across modules)
    approvals = _get_all_approvals()
    approvals[approval_id] = {
        "tool_name": tool_name,
        "tool_input": tool_input,
        "approved": None,  # None = pending, True = approved, False = denied
        "modified_params": None,
        "created_at": time.time(),
    }
    _save_all_approvals(approvals)

    print(f"[approval] Created pending approval: {approval_id} for {tool_name}")
    return approval_id


def resolve_approval(approval_id: str, approved: bool, modified_params: Optional[dict] = None) -> bool:
    """Resolve a pending approval. Returns True if found and resolved.

    Args:
        approval_id: The approval request ID
        approved: Whether to approve or deny
        modified_params: Optional user-modified parameters (only used if approved)
    """
    approvals = _get_all_approvals()

    if approval_id not in approvals:
        print(f"[approval] Approval not found: {approval_id}, available: {list(approvals.keys())}")
        return False

    approvals[approval_id]["approved"] = approved
    if approved and modified_params:
        approvals[approval_id]["modified_params"] = modified_params

    _save_all_approvals(approvals)
    print(f"[approval] Resolved approval: {approval_id}, approved={approved}")
    return True


def wait_for_approval_sync(approval_id: str, timeout: float = 600.0) -> Optional[bool]:
    """Synchronously wait for approval by polling file (for use in hooks).

    Returns: True if approved, False if denied, None if timeout.
    """
    start_time = time.time()
    poll_interval = 0.2  # 200ms

    while True:
        approvals = _get_all_approvals()
        approval = approvals.get(approval_id)

        if not approval:
            print(f"[approval] Approval {approval_id} not found during wait")
            return None

        if approval["approved"] is not None:
            # Resolved - clean up and return
            result = approval["approved"]
            del approvals[approval_id]
            _save_all_approvals(approvals)
            print(f"[approval] Wait complete: {approval_id}, approved={result}")
            return result

        # Check timeout
        elapsed = time.time() - start_time
        if elapsed >= timeout:
            # Timeout - clean up
            del approvals[approval_id]
            _save_all_approvals(approvals)
            print(f"[approval] Timeout waiting for: {approval_id}")
            return None

        time.sleep(poll_interval)


async def wait_for_approval_async(approval_id: str, timeout: float = 600.0) -> Optional[bool]:
    """Asynchronously wait for approval by polling file.

    Returns: True if approved, False if denied, None if timeout.
    """
    start_time = time.time()
    poll_interval = 0.2

    while True:
        approvals = _get_all_approvals()
        approval = approvals.get(approval_id)

        if not approval:
            return None

        if approval["approved"] is not None:
            # Resolved - clean up and return
            result = approval["approved"]
            del approvals[approval_id]
            _save_all_approvals(approvals)
            return result

        # Check timeout
        elapsed = time.time() - start_time
        if elapsed >= timeout:
            del approvals[approval_id]
            _save_all_approvals(approvals)
            return None

        await asyncio.sleep(poll_interval)


def get_pending_approval(approval_id: str) -> Optional[dict]:
    """Get a pending approval by ID."""
    approvals = _get_all_approvals()
    return approvals.get(approval_id)


def get_modified_params(approval_id: str) -> Optional[dict]:
    """Get modified params for a resolved approval (if any).

    Returns the user-modified parameters, or None if not modified/not found.
    Should be called after wait_for_approval_sync returns True.
    """
    approvals = _get_all_approvals()
    approval = approvals.get(approval_id)
    if approval and approval.get("modified_params"):
        return approval["modified_params"]
    return None


def has_pending_approvals() -> bool:
    """Check if there are any pending approvals."""
    approvals = _get_all_approvals()
    return len(approvals) > 0


def poll_approval_status(approval_id: str) -> Optional[bool]:
    """Non-blocking check if approval was resolved.

    Returns: True if approved, False if denied, None if still pending.
    """
    approvals = _get_all_approvals()
    approval = approvals.get(approval_id)

    if not approval:
        return None  # Not found

    if approval["approved"] is not None:
        # Resolved - clean up and return
        result = approval["approved"]
        del approvals[approval_id]
        _save_all_approvals(approvals)
        return result

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


def check_and_consume_pre_approval(tool_name: str) -> bool:
    """Check if tool was pre-approved. If so, consume and return True."""
    data = _read_json_file(_PRE_APPROVED_FILE, [])
    if tool_name in data:
        data.remove(tool_name)
        _write_json_file(_PRE_APPROVED_FILE, data)
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


def get_stream_handling_approval(tool_name: str) -> Optional[str]:
    """Get the approval_id if stream is handling approval for this tool."""
    data = _read_json_file(_STREAM_HANDLING_FILE, {})
    return data.get(tool_name)


def clear_stream_handling_approval(tool_name: str) -> None:
    """Clear the stream handling marker for a tool."""
    data = _read_json_file(_STREAM_HANDLING_FILE, {})
    data.pop(tool_name, None)
    _write_json_file(_STREAM_HANDLING_FILE, data)


# =============================================================================
# Blocked Tools Cache (prevent execution after denial)
# =============================================================================

def add_blocked_tool(tool_name: str, reason: str = "User denied") -> None:
    """Mark a tool as blocked (user denied execution)."""
    data = _read_json_file(_BLOCKED_TOOLS_FILE, {})
    data[tool_name] = reason
    _write_json_file(_BLOCKED_TOOLS_FILE, data)


def is_tool_blocked(tool_name: str) -> tuple[bool, str]:
    """Check if a tool is blocked. Returns (is_blocked, reason)."""
    data = _read_json_file(_BLOCKED_TOOLS_FILE, {})
    if tool_name in data:
        return True, data[tool_name]
    return False, ""


def clear_blocked_tools() -> None:
    """Clear all blocked tools (call at start of new request)."""
    _write_json_file(_BLOCKED_TOOLS_FILE, {})


# =============================================================================
# Cleanup
# =============================================================================

def cleanup_approval_files() -> None:
    """Clean up stale approval files from previous runs."""
    for filepath in [_STREAM_HANDLING_FILE, _PRE_APPROVED_FILE, _BLOCKED_TOOLS_FILE, _PENDING_APPROVALS_FILE]:
        try:
            if filepath.exists():
                filepath.unlink()
        except Exception:
            pass  # Silently ignore cleanup errors
