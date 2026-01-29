"""Middleware for tool execution pipeline.

Middleware components process tool calls before/after execution:
- ResolutionMiddleware: Resolves entity IDs to human-readable names
- Error Handling: Consistent error format for all tool calls
- Rate Limiting: Per-user/org request throttling
- Caching: TTL-based caching for read operations
"""

from .resolution import (
    ResolutionMiddleware,
    ResolutionRule,
    EntityCache,
    create_resolution_middleware,
    DEFAULT_RESOLUTION_RULES,
)

from .error import (
    MCPError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ExternalAPIError,
    error_handler,
    error_handler_sync,
    format_error_response,
)

from .rate_limit import (
    RateLimitConfig,
    RateLimitResult,
    InMemoryRateLimiter,
    get_rate_limiter,
    rate_limit,
    get_rate_limit_headers,
    RATE_LIMITS_BY_PLAN,
)

from .cache import (
    CacheConfig,
    CachedEntry,
    InMemoryCache,
    get_cache,
    hash_args,
    cacheable,
    invalidate_cache_for,
)

__all__ = [
    # Resolution
    "ResolutionMiddleware",
    "ResolutionRule",
    "EntityCache",
    "create_resolution_middleware",
    "DEFAULT_RESOLUTION_RULES",
    # Error handling
    "MCPError",
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "ExternalAPIError",
    "error_handler",
    "error_handler_sync",
    "format_error_response",
    # Rate limiting
    "RateLimitConfig",
    "RateLimitResult",
    "InMemoryRateLimiter",
    "get_rate_limiter",
    "rate_limit",
    "get_rate_limit_headers",
    "RATE_LIMITS_BY_PLAN",
    # Caching
    "CacheConfig",
    "CachedEntry",
    "InMemoryCache",
    "get_cache",
    "hash_args",
    "cacheable",
    "invalidate_cache_for",
]
