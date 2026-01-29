"""Background task implementation for long-running operations.

Provides the BackgroundTask class for tracking progress of operations like
report generation, bulk updates, and data exports.

Usage:
    # Create a task
    task = BackgroundTask(task_id="report_123")

    # Start tracking
    task.start()

    # Update progress
    await task.update_progress(0.25, "Fetching accounts...")
    await task.update_progress(0.50, "Querying metrics...")
    await task.update_progress(0.75, "Aggregating data...")

    # Complete
    task.complete(result={"rows": 100})

    # Or fail
    task.fail("API rate limit exceeded", code="RATE_LIMIT")

Streaming progress:
    async for progress in task.stream_progress():
        yield format_sse(progress.model_dump())
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, AsyncIterator, Any
from uuid import uuid4


class TaskStatus(str, Enum):
    """Status of a background task."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    ERROR = "error"
    CANCELLED = "cancelled"


@dataclass
class TaskProgress:
    """Progress update for a background task."""
    task_id: str
    progress: float  # 0.0 to 1.0
    message: str
    estimated_remaining: Optional[float] = None  # Seconds

    def to_event_dict(self) -> dict[str, Any]:
        """Convert to SSE event dictionary."""
        result: dict[str, Any] = {
            "type": "task_progress",
            "task_id": self.task_id,
            "progress": self.progress,
            "message": self.message,
        }
        if self.estimated_remaining is not None:
            result["estimated_remaining"] = self.estimated_remaining
        return result


@dataclass
class TaskResult:
    """Result of a completed background task."""
    task_id: str
    status: TaskStatus
    message: str
    result: Optional[dict] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    error_details: Optional[dict] = None

    def to_event_dict(self) -> dict[str, Any]:
        """Convert to SSE event dictionary."""
        if self.status == TaskStatus.COMPLETE:
            event: dict[str, Any] = {
                "type": "task_complete",
                "task_id": self.task_id,
                "message": self.message,
            }
            if self.result is not None:
                event["result"] = self.result
            return event
        else:
            event = {
                "type": "task_error",
                "task_id": self.task_id,
                "error": self.error or "Unknown error",
            }
            if self.error_code:
                event["code"] = self.error_code
            if self.error_details:
                event["details"] = self.error_details
            return event


class BackgroundTask:
    """A background task with progress tracking.

    Supports async progress updates that can be streamed to the frontend
    via SSE. Handles timeout, cancellation, and error states.

    Attributes:
        task_id: Unique identifier for the task
        status: Current status (pending, running, complete, error)
        progress: Current progress (0.0 to 1.0)
        message: Latest progress message
        created_at: When the task was created
        started_at: When the task started running
        completed_at: When the task completed/failed
    """

    def __init__(
        self,
        task_id: Optional[str] = None,
        name: Optional[str] = None,
        timeout: float = 300.0,  # 5 minute default timeout
    ):
        """Initialize a background task.

        Args:
            task_id: Unique identifier (generated if not provided)
            name: Human-readable task name
            timeout: Maximum time for task execution in seconds
        """
        self.task_id = task_id or f"task_{uuid4().hex[:12]}"
        self.name = name or "Background Task"
        self.timeout = timeout

        self.status = TaskStatus.PENDING
        self.progress = 0.0
        self.message = "Waiting to start..."

        self.created_at = datetime.now(timezone.utc)
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None

        self._progress_queue: asyncio.Queue[TaskProgress] = asyncio.Queue()
        self._result: Optional[TaskResult] = None
        self._error: Optional[str] = None
        self._error_code: Optional[str] = None
        self._error_details: Optional[dict] = None

    def start(self) -> None:
        """Mark task as running."""
        if self.status != TaskStatus.PENDING:
            raise ValueError(f"Cannot start task in status {self.status}")

        self.status = TaskStatus.RUNNING
        self.started_at = datetime.now(timezone.utc)
        self.message = "Starting..."

    async def update_progress(
        self,
        progress: float,
        message: str,
        estimated_remaining: Optional[float] = None,
    ) -> None:
        """Update task progress.

        Args:
            progress: Progress value from 0.0 to 1.0
            message: Description of current step
            estimated_remaining: Optional estimated seconds remaining
        """
        if self.status != TaskStatus.RUNNING:
            return  # Ignore updates for non-running tasks

        self.progress = max(0.0, min(1.0, progress))
        self.message = message

        await self._progress_queue.put(TaskProgress(
            task_id=self.task_id,
            progress=self.progress,
            message=message,
            estimated_remaining=estimated_remaining,
        ))

    def complete(self, message: str = "Task completed", result: Optional[dict] = None) -> TaskResult:
        """Mark task as successfully completed.

        Args:
            message: Completion message
            result: Optional result data

        Returns:
            TaskResult with completion details
        """
        self.status = TaskStatus.COMPLETE
        self.completed_at = datetime.now(timezone.utc)
        self.progress = 1.0
        self.message = message

        self._result = TaskResult(
            task_id=self.task_id,
            status=TaskStatus.COMPLETE,
            message=message,
            result=result,
        )
        return self._result

    def fail(
        self,
        error: str,
        code: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> TaskResult:
        """Mark task as failed.

        Args:
            error: Error message
            code: Error code for programmatic handling
            details: Additional error context

        Returns:
            TaskResult with error details
        """
        self.status = TaskStatus.ERROR
        self.completed_at = datetime.now(timezone.utc)
        self._error = error
        self._error_code = code
        self._error_details = details
        self.message = error

        self._result = TaskResult(
            task_id=self.task_id,
            status=TaskStatus.ERROR,
            message=error,
            error=error,
            error_code=code,
            error_details=details,
        )
        return self._result

    def cancel(self) -> None:
        """Cancel the task."""
        if self.status in (TaskStatus.COMPLETE, TaskStatus.ERROR):
            return  # Already finished

        self.status = TaskStatus.CANCELLED
        self.completed_at = datetime.now(timezone.utc)
        self.message = "Task cancelled"

    @property
    def is_running(self) -> bool:
        """Check if task is currently running."""
        return self.status == TaskStatus.RUNNING

    @property
    def is_finished(self) -> bool:
        """Check if task has finished (complete, error, or cancelled)."""
        return self.status in (TaskStatus.COMPLETE, TaskStatus.ERROR, TaskStatus.CANCELLED)

    @property
    def elapsed_time(self) -> Optional[float]:
        """Get elapsed time in seconds since task started."""
        if not self.started_at:
            return None

        end_time = self.completed_at or datetime.now(timezone.utc)
        return (end_time - self.started_at).total_seconds()

    async def stream_progress(
        self,
        heartbeat_interval: float = 30.0,
    ) -> AsyncIterator[TaskProgress]:
        """Stream progress updates.

        Yields progress updates as they occur. If no updates are received
        within heartbeat_interval, yields a heartbeat with current progress.

        Args:
            heartbeat_interval: Seconds between heartbeat updates

        Yields:
            TaskProgress updates
        """
        while self.status == TaskStatus.RUNNING:
            try:
                progress = await asyncio.wait_for(
                    self._progress_queue.get(),
                    timeout=heartbeat_interval,
                )
                yield progress
            except asyncio.TimeoutError:
                # Send heartbeat with current progress
                yield TaskProgress(
                    task_id=self.task_id,
                    progress=self.progress,
                    message=self.message or "Still processing...",
                )

    def get_result(self) -> Optional[TaskResult]:
        """Get the task result if finished."""
        return self._result

    def to_dict(self) -> dict:
        """Convert task state to dictionary."""
        return {
            "task_id": self.task_id,
            "name": self.name,
            "status": self.status.value,
            "progress": self.progress,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "elapsed_time": self.elapsed_time,
        }


class TaskManager:
    """Manager for tracking active background tasks.

    Provides centralized tracking and cleanup of background tasks.
    Useful for monitoring and debugging.

    Usage:
        manager = TaskManager()

        # Create and track a task
        task = manager.create_task("report_generation")

        # Get task by ID
        task = manager.get_task("task_abc123")

        # List active tasks
        active = manager.get_active_tasks()

        # Cleanup old tasks
        manager.cleanup_finished(max_age_seconds=3600)
    """

    def __init__(self, max_tasks: int = 1000):
        """Initialize task manager.

        Args:
            max_tasks: Maximum number of tasks to track
        """
        self._tasks: dict[str, BackgroundTask] = {}
        self._max_tasks = max_tasks

    def create_task(
        self,
        name: Optional[str] = None,
        task_id: Optional[str] = None,
        timeout: float = 300.0,
    ) -> BackgroundTask:
        """Create and register a new task.

        Args:
            name: Human-readable task name
            task_id: Optional task ID (generated if not provided)
            timeout: Task timeout in seconds

        Returns:
            Created BackgroundTask
        """
        # Cleanup if at capacity
        if len(self._tasks) >= self._max_tasks:
            self.cleanup_finished()

        task = BackgroundTask(task_id=task_id, name=name, timeout=timeout)
        self._tasks[task.task_id] = task
        return task

    def get_task(self, task_id: str) -> Optional[BackgroundTask]:
        """Get a task by ID.

        Args:
            task_id: Task identifier

        Returns:
            BackgroundTask or None if not found
        """
        return self._tasks.get(task_id)

    def get_active_tasks(self) -> list[BackgroundTask]:
        """Get all currently running tasks.

        Returns:
            List of running tasks
        """
        return [t for t in self._tasks.values() if t.status == TaskStatus.RUNNING]

    def get_pending_tasks(self) -> list[BackgroundTask]:
        """Get all pending tasks.

        Returns:
            List of pending tasks
        """
        return [t for t in self._tasks.values() if t.status == TaskStatus.PENDING]

    def get_finished_tasks(self) -> list[BackgroundTask]:
        """Get all finished tasks (complete, error, cancelled).

        Returns:
            List of finished tasks
        """
        return [t for t in self._tasks.values() if t.is_finished]

    def remove_task(self, task_id: str) -> Optional[BackgroundTask]:
        """Remove a task from tracking.

        Args:
            task_id: Task identifier

        Returns:
            Removed task or None if not found
        """
        return self._tasks.pop(task_id, None)

    def cleanup_finished(self, max_age_seconds: float = 3600) -> int:
        """Remove finished tasks older than max_age.

        Args:
            max_age_seconds: Maximum age of finished tasks to keep

        Returns:
            Number of tasks removed
        """
        now = datetime.now(timezone.utc)
        to_remove = []

        for task_id, task in self._tasks.items():
            if not task.is_finished:
                continue

            if task.completed_at:
                age = (now - task.completed_at).total_seconds()
                if age > max_age_seconds:
                    to_remove.append(task_id)

        for task_id in to_remove:
            del self._tasks[task_id]

        return len(to_remove)

    def cancel_all(self) -> int:
        """Cancel all running and pending tasks.

        Returns:
            Number of tasks cancelled
        """
        count = 0
        for task in self._tasks.values():
            if not task.is_finished:
                task.cancel()
                count += 1
        return count

    def stats(self) -> dict:
        """Get task statistics.

        Returns:
            Dictionary with task counts by status
        """
        stats = {
            "total": len(self._tasks),
            "pending": 0,
            "running": 0,
            "complete": 0,
            "error": 0,
            "cancelled": 0,
        }

        for task in self._tasks.values():
            stats[task.status.value] += 1

        return stats


# Global task manager instance
_task_manager: Optional[TaskManager] = None


def get_task_manager() -> TaskManager:
    """Get the global task manager instance.

    Returns:
        TaskManager singleton
    """
    global _task_manager
    if _task_manager is None:
        _task_manager = TaskManager()
    return _task_manager
