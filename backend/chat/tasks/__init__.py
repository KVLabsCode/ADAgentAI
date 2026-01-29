"""Background task system for long-running operations.

Provides infrastructure for running tasks with progress streaming via SSE.
Used for operations like report generation that take significant time.

Features:
- Progress updates streamed to frontend via SSE
- Task lifecycle management (pending, running, complete, error)
- Timeout handling with graceful cleanup
- Resume capability for brief network disconnections
"""

from .background import (
    BackgroundTask,
    TaskStatus,
    TaskProgress,
    TaskManager,
)

__all__ = [
    "BackgroundTask",
    "TaskStatus",
    "TaskProgress",
    "TaskManager",
]
