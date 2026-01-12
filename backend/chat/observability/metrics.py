"""Metrics extraction and storage for run summaries.

This module handles:
1. Extracting metrics from LangSmith runs
2. Token counting and cost calculation
3. Storing run summaries to the database for user-facing analytics
"""

import os
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional
import httpx

from langsmith.schemas import Run


# Model pricing per 1M tokens (USD)
# Updated: 2026-01-12
MODEL_PRICING: dict[str, dict[str, float]] = {
    # Anthropic Claude 4.x
    "claude-opus-4-5-20251101": {"input": 15.00, "output": 75.00},
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
    "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},

    # OpenRouter prefixed models (same pricing)
    "anthropic/claude-opus-4-5-20251101": {"input": 15.00, "output": 75.00},
    "anthropic/claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
    "anthropic/claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
    "anthropic/claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},

    # Google Gemini (2.0 series)
    "gemini-2.0-flash-exp": {"input": 0.075, "output": 0.30},
    "gemini-2.0-flash": {"input": 0.075, "output": 0.30},
    "gemini-2.0-pro": {"input": 1.25, "output": 5.00},
    "google/gemini-2.0-flash-exp": {"input": 0.075, "output": 0.30},
    "google/gemini-2.0-flash": {"input": 0.075, "output": 0.30},

    # Google Gemini (1.5 series)
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
    "google/gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "google/gemini-1.5-pro": {"input": 1.25, "output": 5.00},

    # OpenAI (for reference/future support)
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "openai/gpt-4o": {"input": 2.50, "output": 10.00},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.60},
}

# Default pricing for unknown models (conservative estimate)
DEFAULT_PRICING = {"input": 3.00, "output": 15.00}


def calculate_cost(
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
) -> float:
    """Calculate estimated cost for a model invocation.

    Args:
        model: Model identifier (e.g., "claude-sonnet-4-20250514")
        prompt_tokens: Number of input tokens
        completion_tokens: Number of output tokens

    Returns:
        Estimated cost in USD
    """
    # Look up pricing, fall back to default
    pricing = MODEL_PRICING.get(model, DEFAULT_PRICING)

    # Calculate cost (pricing is per 1M tokens)
    input_cost = prompt_tokens * pricing["input"] / 1_000_000
    output_cost = completion_tokens * pricing["output"] / 1_000_000

    return round(input_cost + output_cost, 6)


def get_model_pricing(model: str) -> dict[str, float]:
    """Get pricing for a specific model.

    Args:
        model: Model identifier

    Returns:
        Dict with 'input' and 'output' prices per 1M tokens
    """
    return MODEL_PRICING.get(model, DEFAULT_PRICING)


def estimate_tokens_from_text(text: str) -> int:
    """Rough estimate of tokens from text length.

    This is a fallback when actual token counts aren't available.
    Uses ~4 characters per token as a rough estimate for English text.

    Args:
        text: Text to estimate tokens for

    Returns:
        Estimated token count
    """
    if not text:
        return 0
    # Rough estimate: ~4 characters per token for English
    return len(text) // 4


@dataclass
class RunMetrics:
    """Metrics extracted from a LangSmith run for storage."""

    user_id: str
    organization_id: Optional[str]
    langsmith_run_id: str
    thread_id: Optional[str]

    # Token metrics
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0

    # Tool metrics
    tool_calls: int = 0

    # Performance
    latency_ms: Optional[int] = None

    # Outcome
    status: str = "success"  # success, error, cancelled
    error_message: Optional[str] = None

    # Routing info
    service: Optional[str] = None
    capability: Optional[str] = None

    # Model info
    model: Optional[str] = None

    # Cost
    total_cost: Optional[float] = None

    # Timestamps
    created_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        """Convert to dict for API calls."""
        data = asdict(self)
        # Convert datetime to ISO string
        if data.get("created_at"):
            data["created_at"] = data["created_at"].isoformat()
        return data


def extract_metrics_from_run(
    run: Run,
    user_id: str,
    organization_id: Optional[str] = None,
    thread_id: Optional[str] = None,
) -> RunMetrics:
    """Extract RunMetrics from a LangSmith Run object.

    Args:
        run: LangSmith Run object
        user_id: User ID (from original request)
        organization_id: Organization ID (from original request)
        thread_id: Thread/stream ID

    Returns:
        Populated RunMetrics dataclass
    """
    # Extract metadata if available
    metadata = run.extra.get("metadata", {}) if run.extra else {}

    # Calculate latency
    latency_ms = None
    if run.start_time and run.end_time:
        latency_ms = int((run.end_time - run.start_time).total_seconds() * 1000)

    # Count tool calls from child runs (if available)
    tool_calls = 0
    if run.child_run_ids:
        # Each tool execution is typically a child run
        tool_calls = len([r for r in (run.child_run_ids or []) if r])

    # Determine status
    status = "success"
    error_message = None
    if run.error:
        status = "error"
        error_message = str(run.error)[:500]  # Truncate long errors
    elif run.status == "cancelled":
        status = "cancelled"

    # Get token counts
    input_tokens = run.prompt_tokens or 0
    output_tokens = run.completion_tokens or 0
    total_tokens = run.total_tokens or (input_tokens + output_tokens)

    # Get model name for cost calculation
    model = metadata.get("model") or metadata.get("ls_model_name")

    # Calculate cost - use LangSmith's if available, otherwise calculate
    total_cost: Optional[float] = None
    if run.total_cost:
        total_cost = float(run.total_cost)
    elif model and (input_tokens > 0 or output_tokens > 0):
        total_cost = calculate_cost(model, input_tokens, output_tokens)

    return RunMetrics(
        user_id=user_id,
        organization_id=organization_id,
        langsmith_run_id=str(run.id),
        thread_id=thread_id or metadata.get("thread_id"),
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        tool_calls=tool_calls,
        latency_ms=latency_ms,
        status=status,
        error_message=error_message,
        service=metadata.get("service"),
        capability=metadata.get("capability"),
        model=model,
        total_cost=total_cost,
        created_at=run.start_time,
    )


async def save_run_summary(metrics: RunMetrics) -> bool:
    """Save run summary to the database via API.

    The API endpoint handles the actual database insert to keep
    the chat service lightweight.

    Args:
        metrics: RunMetrics to save

    Returns:
        True if saved successfully
    """
    api_url = os.environ.get("API_URL", "http://localhost:3001")
    internal_api_key = os.environ.get("INTERNAL_API_KEY", "")

    if not internal_api_key:
        print("[metrics] INTERNAL_API_KEY not set, skipping run summary save")
        return False

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{api_url}/api/internal/run-summaries",
                json=metrics.to_dict(),
                headers={"x-internal-api-key": internal_api_key},
            )
            if response.status_code == 201:
                return True
            else:
                print(f"[metrics] Failed to save run summary: {response.status_code}")
                return False
    except Exception as e:
        print(f"[metrics] Error saving run summary: {e}")
        return False


@dataclass
class TokenUsage:
    """Token usage for a single LLM call."""

    model: str
    prompt_tokens: int
    completion_tokens: int
    cost: float

    @classmethod
    def from_response(
        cls,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
    ) -> "TokenUsage":
        """Create TokenUsage from LLM response."""
        cost = calculate_cost(model, prompt_tokens, completion_tokens)
        return cls(
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost=cost,
        )


class TokenTracker:
    """Track accumulated token usage across multiple LLM calls in a session.

    Usage:
        tracker = TokenTracker()
        tracker.add(model="claude-sonnet-4", prompt_tokens=100, completion_tokens=50)
        tracker.add(model="claude-sonnet-4", prompt_tokens=200, completion_tokens=100)
        print(f"Total cost: ${tracker.total_cost:.4f}")
    """

    def __init__(self):
        self._calls: list[TokenUsage] = []

    def add(
        self,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
    ) -> TokenUsage:
        """Add a new LLM call's token usage.

        Args:
            model: Model identifier
            prompt_tokens: Number of input tokens
            completion_tokens: Number of output tokens

        Returns:
            TokenUsage for this call
        """
        usage = TokenUsage.from_response(model, prompt_tokens, completion_tokens)
        self._calls.append(usage)
        return usage

    def add_from_langchain(self, response_metadata: dict) -> Optional[TokenUsage]:
        """Add token usage from a LangChain response's metadata.

        Args:
            response_metadata: The response.response_metadata from LangChain

        Returns:
            TokenUsage if token info available, else None
        """
        # LangChain typically includes these fields
        usage = response_metadata.get("usage", {})
        model = response_metadata.get("model", response_metadata.get("model_name", ""))

        prompt_tokens = usage.get("input_tokens", usage.get("prompt_tokens", 0))
        completion_tokens = usage.get("output_tokens", usage.get("completion_tokens", 0))

        if model and (prompt_tokens > 0 or completion_tokens > 0):
            return self.add(model, prompt_tokens, completion_tokens)
        return None

    @property
    def total_prompt_tokens(self) -> int:
        """Total input tokens across all calls."""
        return sum(c.prompt_tokens for c in self._calls)

    @property
    def total_completion_tokens(self) -> int:
        """Total output tokens across all calls."""
        return sum(c.completion_tokens for c in self._calls)

    @property
    def total_tokens(self) -> int:
        """Total tokens (input + output) across all calls."""
        return self.total_prompt_tokens + self.total_completion_tokens

    @property
    def total_cost(self) -> float:
        """Total cost in USD across all calls."""
        return sum(c.cost for c in self._calls)

    @property
    def call_count(self) -> int:
        """Number of LLM calls tracked."""
        return len(self._calls)

    @property
    def calls(self) -> list[TokenUsage]:
        """All tracked calls."""
        return self._calls.copy()

    def get_summary(self) -> dict:
        """Get a summary dict of all tracked usage.

        Returns:
            Dict with total tokens, cost, and call count
        """
        return {
            "total_prompt_tokens": self.total_prompt_tokens,
            "total_completion_tokens": self.total_completion_tokens,
            "total_tokens": self.total_tokens,
            "total_cost": round(self.total_cost, 6),
            "call_count": self.call_count,
            "models_used": list(set(c.model for c in self._calls)),
        }

    def reset(self):
        """Clear all tracked calls."""
        self._calls.clear()
