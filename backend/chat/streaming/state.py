"""Stream state management - tracks active streams and event queue."""

import json
import tempfile
import time
from pathlib import Path
from queue import Queue
from typing import Optional, Dict, List, Any
from threading import Lock

# File-based storage for cross-module sharing
# File storage ensures consistent state across async boundaries.
_TEMP_DIR = Path(tempfile.gettempdir())
_ACTIVE_STREAMS_FILE = _TEMP_DIR / "adagent_active_streams.json"
_CURRENT_STREAM_FILE = _TEMP_DIR / "adagent_current_stream.json"

# Thread-safe event queue for hooks to push events
_event_queue: Queue = Queue()

# Pending results store for streams that ended but graph is still running
# Key: stream_id, Value: {"events": [], "result": None, "done": False, "created_at": timestamp}
_pending_results: Dict[str, Dict[str, Any]] = {}
_pending_results_lock = Lock()


def _read_json_file(filepath: Path, default=None):
    """Read JSON from file, return default if file doesn't exist."""
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


def is_streaming_active() -> bool:
    """Check if any streaming request is active."""
    data = _read_json_file(_ACTIVE_STREAMS_FILE, [])
    return len(data) > 0


def start_stream(stream_id: str) -> None:
    """Mark a stream as active and set as current."""
    data = _read_json_file(_ACTIVE_STREAMS_FILE, [])
    if stream_id not in data:
        data.append(stream_id)
        _write_json_file(_ACTIVE_STREAMS_FILE, data)
    # Track current stream for hooks to use as fallback
    _write_json_file(_CURRENT_STREAM_FILE, {"stream_id": stream_id})


def end_stream(stream_id: str) -> None:
    """Mark a stream as ended (but keep current stream_id for pending results)."""
    data = _read_json_file(_ACTIVE_STREAMS_FILE, [])
    if stream_id in data:
        data.remove(stream_id)
        _write_json_file(_ACTIVE_STREAMS_FILE, data)
    # Don't clear current stream - hooks may still need it for pending results


def get_current_stream_id() -> Optional[str]:
    """Get the current stream ID (for hooks to use with pending results)."""
    data = _read_json_file(_CURRENT_STREAM_FILE, {})
    return data.get("stream_id")


def clear_current_stream() -> None:
    """Clear current stream ID (called when graph execution is fully done)."""
    try:
        if _CURRENT_STREAM_FILE.exists():
            _CURRENT_STREAM_FILE.unlink()
    except Exception:
        pass


def push_event(event: dict) -> bool:
    """Push event to queue from any context.

    If streaming is active, pushes to queue for immediate SSE delivery.
    If stream ended but graph is still running, stores in pending results
    so the frontend can poll for results later.

    Returns True if pushed/stored, False otherwise.
    """
    if is_streaming_active():
        try:
            _event_queue.put_nowait(event)
            return True
        except Exception:
            return False

    # Stream ended - try to store in pending results for later retrieval
    stream_id = get_current_stream_id()
    if stream_id:
        return add_pending_event(stream_id, event)

    return False


def get_event_queue() -> Queue:
    """Get the event queue for draining."""
    return _event_queue


def clear_event_queue() -> None:
    """Clear all events from queue."""
    while not _event_queue.empty():
        try:
            _event_queue.get_nowait()
        except:
            break


def cleanup_state_files() -> None:
    """Clean up stale state files from previous runs."""
    for filepath in [_ACTIVE_STREAMS_FILE, _CURRENT_STREAM_FILE]:
        try:
            if filepath.exists():
                filepath.unlink()
        except Exception:
            pass  # Silently ignore cleanup errors


# =============================================================================
# Pending Results Store - for streams that ended but graph is still running
# =============================================================================

def create_pending_result(stream_id: str) -> None:
    """Create a pending result entry for a stream."""
    with _pending_results_lock:
        _pending_results[stream_id] = {
            "events": [],
            "result": None,
            "error": None,
            "done": False,
            "created_at": time.time(),
        }


def add_pending_event(stream_id: str, event: dict) -> bool:
    """Add an event to a pending result. Returns True if added."""
    with _pending_results_lock:
        if stream_id not in _pending_results:
            return False
        _pending_results[stream_id]["events"].append(event)
        return True


def set_pending_result(stream_id: str, result: Optional[str], error: Optional[str] = None) -> bool:
    """Set the final result for a pending stream. Returns True if set."""
    with _pending_results_lock:
        if stream_id not in _pending_results:
            return False
        _pending_results[stream_id]["result"] = result
        _pending_results[stream_id]["error"] = error
        _pending_results[stream_id]["done"] = True
        return True


def get_pending_result(stream_id: str) -> Optional[Dict[str, Any]]:
    """Get pending result for a stream. Returns None if not found."""
    with _pending_results_lock:
        return _pending_results.get(stream_id)


def consume_pending_result(stream_id: str) -> Optional[Dict[str, Any]]:
    """Get and remove pending result for a stream."""
    with _pending_results_lock:
        return _pending_results.pop(stream_id, None)


def cleanup_old_pending_results(max_age_seconds: float = 900.0) -> None:
    """Remove pending results older than max_age_seconds (default 15 min)."""
    now = time.time()
    with _pending_results_lock:
        expired = [
            sid for sid, data in _pending_results.items()
            if now - data.get("created_at", 0) > max_age_seconds
        ]
        for sid in expired:
            del _pending_results[sid]
