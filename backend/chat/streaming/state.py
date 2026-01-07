"""Stream state management - tracks active streams and event queue."""

import json
import tempfile
from pathlib import Path
from queue import Queue
from typing import Optional

# File-based storage for cross-module sharing
# NOTE: CrewAI imports modules separately, creating different instances.
# File storage ensures both async stream and sync hooks see the same state.
_TEMP_DIR = Path(tempfile.gettempdir())
_ACTIVE_STREAMS_FILE = _TEMP_DIR / "adagent_active_streams.json"

# Thread-safe event queue for hooks to push events
_event_queue: Queue = Queue()


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
    except Exception as e:
        print(f"  [FILE ERROR] Failed to write {filepath}: {e}")


def is_streaming_active() -> bool:
    """Check if any streaming request is active."""
    data = _read_json_file(_ACTIVE_STREAMS_FILE, [])
    return len(data) > 0


def start_stream(stream_id: str) -> None:
    """Mark a stream as active."""
    data = _read_json_file(_ACTIVE_STREAMS_FILE, [])
    if stream_id not in data:
        data.append(stream_id)
        _write_json_file(_ACTIVE_STREAMS_FILE, data)
    print(f"  [STREAM] Started: {stream_id} (active={len(data)})", flush=True)


def end_stream(stream_id: str) -> None:
    """Mark a stream as ended."""
    data = _read_json_file(_ACTIVE_STREAMS_FILE, [])
    if stream_id in data:
        data.remove(stream_id)
        _write_json_file(_ACTIVE_STREAMS_FILE, data)
    print(f"  [STREAM] Ended: {stream_id} (active={len(data)})", flush=True)


def push_event(event: dict) -> bool:
    """Push event to queue from any context (hooks).

    Returns True if pushed, False if no active stream.
    """
    event_type = event.get("type", "unknown")

    if not is_streaming_active():
        print(f"  [QUEUE SKIP] {event_type} - no active stream", flush=True)
        return False

    try:
        _event_queue.put_nowait(event)
        print(f"  [QUEUE] {event_type}", flush=True)
        return True
    except Exception as e:
        print(f"  [QUEUE ERROR] {event_type}: {e}", flush=True)
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
    for filepath in [_ACTIVE_STREAMS_FILE]:
        try:
            if filepath.exists():
                filepath.unlink()
                print(f"  Cleaned up: {filepath}")
        except Exception as e:
            print(f"  Warning: couldn't clean {filepath}: {e}")
