"""Rate limiting middleware for MCP tools.

Provides per-user and per-organization rate limiting using a sliding window
algorithm. Supports multiple rate limit tiers based on subscription plan.

Default limits:
- Free tier: 60 requests/minute
- Pro tier: 200 requests/minute
- Enterprise tier: 1000 requests/minute
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from functools import wraps
from typing import Callable, TypeVar, Any, Optional
import logging

from .error import RateLimitError

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting.

    Attributes:
        requests_per_window: Maximum requests allowed in the window
        window_seconds: Duration of the rate limit window in seconds
        key_prefix: Prefix for cache keys
    """
    requests_per_window: int = 100
    window_seconds: int = 60
    key_prefix: str = "ratelimit"


@dataclass
class RateLimitResult:
    """Result of a rate limit check.

    Attributes:
        allowed: Whether the request is allowed
        current_count: Current number of requests in the window
        limit: Maximum allowed requests
        remaining: Remaining requests in the window
        reset_at: When the current window resets
        retry_after: Seconds to wait if rate limited
    """
    allowed: bool
    current_count: int
    limit: int
    remaining: int
    reset_at: datetime
    retry_after: Optional[int] = None


# Default rate limits by plan
RATE_LIMITS_BY_PLAN: dict[str, RateLimitConfig] = {
    "free": RateLimitConfig(requests_per_window=60, window_seconds=60),
    "pro": RateLimitConfig(requests_per_window=200, window_seconds=60),
    "enterprise": RateLimitConfig(requests_per_window=1000, window_seconds=60),
}


class InMemoryRateLimiter:
    """In-memory rate limiter using sliding window algorithm.

    Suitable for single-process deployments. For distributed deployments,
    use RedisRateLimiter instead.

    Usage:
        limiter = InMemoryRateLimiter()

        # Check rate limit
        result = limiter.check("user123", "org456", RateLimitConfig())
        if not result.allowed:
            raise RateLimitError(retry_after=result.retry_after)
    """

    def __init__(self):
        """Initialize the in-memory rate limiter."""
        # Structure: {key: [(timestamp, count), ...]}
        self._windows: dict[str, list[tuple[datetime, int]]] = {}

    def _make_key(self, user_id: str, org_id: str, config: RateLimitConfig) -> str:
        """Generate cache key for rate limiting."""
        return f"{config.key_prefix}:{org_id}:{user_id}"

    def _cleanup_expired(self, key: str, window_seconds: int) -> None:
        """Remove expired entries from the window."""
        if key not in self._windows:
            return

        now = datetime.now(timezone.utc)
        cutoff = now.timestamp() - window_seconds

        self._windows[key] = [
            (ts, count) for ts, count in self._windows[key]
            if ts.timestamp() > cutoff
        ]

        if not self._windows[key]:
            del self._windows[key]

    def check(
        self,
        user_id: str,
        org_id: str,
        config: RateLimitConfig,
    ) -> RateLimitResult:
        """Check rate limit and increment counter.

        Args:
            user_id: User identifier
            org_id: Organization identifier
            config: Rate limit configuration

        Returns:
            RateLimitResult with limit status
        """
        key = self._make_key(user_id, org_id, config)
        now = datetime.now(timezone.utc)

        # Cleanup expired entries
        self._cleanup_expired(key, config.window_seconds)

        # Count current requests
        if key not in self._windows:
            self._windows[key] = []

        current_count = sum(count for _, count in self._windows[key])

        # Calculate reset time
        if self._windows.get(key):
            oldest = min(ts for ts, _ in self._windows[key])
            reset_at = datetime.fromtimestamp(
                oldest.timestamp() + config.window_seconds,
                tz=timezone.utc
            )
        else:
            reset_at = datetime.fromtimestamp(
                now.timestamp() + config.window_seconds,
                tz=timezone.utc
            )

        # Check if over limit
        if current_count >= config.requests_per_window:
            retry_after = int((reset_at - now).total_seconds())
            return RateLimitResult(
                allowed=False,
                current_count=current_count,
                limit=config.requests_per_window,
                remaining=0,
                reset_at=reset_at,
                retry_after=max(1, retry_after),
            )

        # Increment counter
        self._windows[key].append((now, 1))

        return RateLimitResult(
            allowed=True,
            current_count=current_count + 1,
            limit=config.requests_per_window,
            remaining=config.requests_per_window - current_count - 1,
            reset_at=reset_at,
        )

    def reset(self, user_id: str, org_id: str, config: RateLimitConfig) -> None:
        """Reset rate limit for a user/org pair.

        Args:
            user_id: User identifier
            org_id: Organization identifier
            config: Rate limit configuration
        """
        key = self._make_key(user_id, org_id, config)
        self._windows.pop(key, None)

    def clear_all(self) -> None:
        """Clear all rate limit data."""
        self._windows.clear()


# Global in-memory rate limiter instance
_rate_limiter: Optional[InMemoryRateLimiter] = None


def get_rate_limiter() -> InMemoryRateLimiter:
    """Get the global rate limiter instance."""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = InMemoryRateLimiter()
    return _rate_limiter


def rate_limit(
    config: Optional[RateLimitConfig] = None,
    plan_based: bool = True,
) -> Callable[[F], F]:
    """Decorator for rate limiting tool calls.

    Applies rate limiting based on user/org from context. Can use fixed
    config or plan-based limits.

    Args:
        config: Fixed rate limit config (overrides plan-based)
        plan_based: Whether to use plan-based limits

    Usage:
        @rate_limit()  # Uses plan-based limits
        async def my_tool(ctx, arg1):
            pass

        @rate_limit(config=RateLimitConfig(requests_per_window=10))
        async def limited_tool(ctx, arg1):
            pass
    """
    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Extract context (first argument after self/ctx)
            ctx = args[0] if args else kwargs.get("ctx")
            if not ctx:
                # No context, skip rate limiting
                return await func(*args, **kwargs)

            # Get user/org from context
            request_context = getattr(ctx, "request_context", {})
            if isinstance(request_context, dict):
                user_id = request_context.get("user_id", "anonymous")
                org_id = request_context.get("organization_id", "default")
                plan = request_context.get("plan", "free")
            else:
                user_id = "anonymous"
                org_id = "default"
                plan = "free"

            # Determine config
            effective_config = config
            if effective_config is None and plan_based:
                effective_config = RATE_LIMITS_BY_PLAN.get(plan, RATE_LIMITS_BY_PLAN["free"])
            elif effective_config is None:
                effective_config = RateLimitConfig()

            # Check rate limit
            limiter = get_rate_limiter()
            result = limiter.check(user_id, org_id, effective_config)

            if not result.allowed:
                logger.warning(
                    f"Rate limit exceeded for user={user_id} org={org_id}: "
                    f"{result.current_count}/{result.limit}"
                )
                raise RateLimitError(
                    message="Rate limit exceeded. Please wait before retrying.",
                    retry_after=result.retry_after,
                    details={
                        "limit": result.limit,
                        "current": result.current_count,
                        "reset_at": result.reset_at.isoformat(),
                    },
                )

            return await func(*args, **kwargs)
        return wrapper  # type: ignore
    return decorator


def get_rate_limit_headers(result: RateLimitResult) -> dict[str, str]:
    """Generate standard rate limit headers.

    Args:
        result: Rate limit check result

    Returns:
        Dictionary of rate limit headers
    """
    headers = {
        "X-RateLimit-Limit": str(result.limit),
        "X-RateLimit-Remaining": str(result.remaining),
        "X-RateLimit-Reset": str(int(result.reset_at.timestamp())),
    }
    if result.retry_after:
        headers["Retry-After"] = str(result.retry_after)
    return headers
