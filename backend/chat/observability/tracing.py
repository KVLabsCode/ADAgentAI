"""LangSmith tracing utilities for observability.

This module provides helpers for interacting with LangSmith traces,
including fetching run details, metrics, and adding feedback.
"""

import os
from typing import Optional
from functools import lru_cache

from langsmith import Client
from langsmith.schemas import Run


@lru_cache(maxsize=1)
def get_langsmith_client() -> Optional[Client]:
    """Get a cached LangSmith client.

    Returns None if API key is not configured.
    """
    api_key = os.environ.get("LANGSMITH_API_KEY")
    if not api_key:
        return None

    return Client(api_key=api_key)


def get_run_by_id(run_id: str) -> Optional[Run]:
    """Fetch a LangSmith run by its ID.

    Args:
        run_id: The LangSmith run ID (UUID)

    Returns:
        Run object or None if not found/client unavailable
    """
    client = get_langsmith_client()
    if not client:
        return None

    try:
        return client.read_run(run_id)
    except Exception as e:
        print(f"[observability] Error fetching run {run_id}: {e}")
        return None


def get_run_metrics(run_id: str) -> Optional[dict]:
    """Extract metrics from a LangSmith run.

    Args:
        run_id: The LangSmith run ID

    Returns:
        Dict with metrics (tokens, latency, etc.) or None
    """
    run = get_run_by_id(run_id)
    if not run:
        return None

    return {
        "run_id": str(run.id),
        "name": run.name,
        "run_type": run.run_type,
        "status": run.status,
        "start_time": run.start_time.isoformat() if run.start_time else None,
        "end_time": run.end_time.isoformat() if run.end_time else None,
        "latency_ms": int((run.end_time - run.start_time).total_seconds() * 1000)
        if run.start_time and run.end_time
        else None,
        "total_tokens": run.total_tokens,
        "prompt_tokens": run.prompt_tokens,
        "completion_tokens": run.completion_tokens,
        "total_cost": run.total_cost,
        "error": run.error,
        "metadata": run.extra.get("metadata", {}) if run.extra else {},
    }


def add_run_feedback(
    run_id: str,
    key: str,
    score: Optional[float] = None,
    value: Optional[str] = None,
    comment: Optional[str] = None,
) -> bool:
    """Add feedback to a LangSmith run.

    Args:
        run_id: The LangSmith run ID
        key: Feedback key (e.g., "correctness", "user_rating")
        score: Numeric score (0.0 - 1.0)
        value: String value
        comment: Optional comment

    Returns:
        True if feedback was added successfully
    """
    client = get_langsmith_client()
    if not client:
        return False

    try:
        client.create_feedback(
            run_id=run_id,
            key=key,
            score=score,
            value=value,
            comment=comment,
        )
        return True
    except Exception as e:
        print(f"[observability] Error adding feedback to run {run_id}: {e}")
        return False


def list_runs_for_user(
    user_id: str,
    project_name: Optional[str] = None,
    limit: int = 100,
) -> list[dict]:
    """List recent LangSmith runs for a user.

    Args:
        user_id: User ID to filter by (from metadata)
        project_name: Optional project name filter
        limit: Maximum runs to return

    Returns:
        List of run summaries
    """
    client = get_langsmith_client()
    if not client:
        return []

    try:
        # Filter by user_id in metadata
        filter_str = f'eq(metadata.user_id, "{user_id}")'

        runs = client.list_runs(
            project_name=project_name or os.environ.get("LANGSMITH_PROJECT"),
            filter=filter_str,
            limit=limit,
        )

        return [
            {
                "run_id": str(run.id),
                "name": run.name,
                "status": run.status,
                "start_time": run.start_time.isoformat() if run.start_time else None,
                "total_tokens": run.total_tokens,
                "total_cost": run.total_cost,
            }
            for run in runs
        ]
    except Exception as e:
        print(f"[observability] Error listing runs for user {user_id}: {e}")
        return []
