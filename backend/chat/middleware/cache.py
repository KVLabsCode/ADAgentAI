"""Caching middleware for MCP tools.

Provides caching for read operations to reduce API calls and improve
response times. Supports TTL-based expiration and per-user cache isolation.

Default behavior:
- Cache read operations (list, get) with 5-minute TTL
- Skip caching for mutations (create, update, delete)
- Per-user cache isolation
"""

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from functools import wraps
from typing import Callable, TypeVar, Any, Optional
import logging

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


@dataclass
class CacheConfig:
    """Configuration for caching.

    Attributes:
        ttl_seconds: Time-to-live for cache entries in seconds
        key_prefix: Prefix for cache keys
        per_user: Whether to isolate cache per user
        skip_on_error: Whether to skip caching when tool returns an error
    """
    ttl_seconds: int = 300  # 5 minutes
    key_prefix: str = "cache"
    per_user: bool = True
    skip_on_error: bool = True


@dataclass
class CachedEntry:
    """A cached value with metadata.

    Attributes:
        value: The cached value
        created_at: When the entry was created
        expires_at: When the entry expires
        tool_name: Name of the tool that generated the value
    """
    value: Any
    created_at: datetime
    expires_at: datetime
    tool_name: str

    @property
    def is_expired(self) -> bool:
        """Check if the entry has expired."""
        return datetime.now(timezone.utc) > self.expires_at

    @property
    def age_seconds(self) -> float:
        """Get the age of the entry in seconds."""
        return (datetime.now(timezone.utc) - self.created_at).total_seconds()


class InMemoryCache:
    """In-memory cache for tool results.

    Suitable for single-process deployments. For distributed deployments,
    use RedisCache instead.

    Usage:
        cache = InMemoryCache()

        # Get from cache
        entry = cache.get("tool_name", args_hash, user_id)
        if entry and not entry.is_expired:
            return entry.value

        # Store in cache
        result = await tool_call()
        cache.set("tool_name", args_hash, user_id, result, ttl=300)
    """

    def __init__(self, max_entries: int = 10000):
        """Initialize the cache.

        Args:
            max_entries: Maximum number of cache entries
        """
        self._cache: dict[str, CachedEntry] = {}
        self._max_entries = max_entries

    def _make_key(
        self,
        tool_name: str,
        args_hash: str,
        user_id: Optional[str],
        config: CacheConfig,
    ) -> str:
        """Generate cache key."""
        if config.per_user and user_id:
            return f"{config.key_prefix}:{user_id}:{tool_name}:{args_hash}"
        return f"{config.key_prefix}:{tool_name}:{args_hash}"

    def get(
        self,
        tool_name: str,
        args_hash: str,
        user_id: Optional[str],
        config: CacheConfig,
    ) -> Optional[CachedEntry]:
        """Get an entry from the cache.

        Args:
            tool_name: Name of the tool
            args_hash: Hash of the arguments
            user_id: User identifier
            config: Cache configuration

        Returns:
            CachedEntry or None if not found/expired
        """
        key = self._make_key(tool_name, args_hash, user_id, config)
        entry = self._cache.get(key)

        if entry is None:
            return None

        if entry.is_expired:
            del self._cache[key]
            return None

        return entry

    def set(
        self,
        tool_name: str,
        args_hash: str,
        user_id: Optional[str],
        value: Any,
        config: CacheConfig,
    ) -> None:
        """Store an entry in the cache.

        Args:
            tool_name: Name of the tool
            args_hash: Hash of the arguments
            user_id: User identifier
            value: Value to cache
            config: Cache configuration
        """
        # Cleanup if at capacity
        if len(self._cache) >= self._max_entries:
            self._cleanup_expired()
            if len(self._cache) >= self._max_entries:
                # Still at capacity, remove oldest entries
                self._evict_oldest(len(self._cache) - self._max_entries + 100)

        key = self._make_key(tool_name, args_hash, user_id, config)
        now = datetime.now(timezone.utc)

        self._cache[key] = CachedEntry(
            value=value,
            created_at=now,
            expires_at=now + timedelta(seconds=config.ttl_seconds),
            tool_name=tool_name,
        )

    def invalidate(
        self,
        tool_name: str,
        args_hash: Optional[str] = None,
        user_id: Optional[str] = None,
        config: Optional[CacheConfig] = None,
    ) -> int:
        """Invalidate cache entries.

        Args:
            tool_name: Tool name to invalidate
            args_hash: Specific args hash (or None for all)
            user_id: Specific user (or None for all)
            config: Cache configuration

        Returns:
            Number of entries invalidated
        """
        config = config or CacheConfig()
        to_remove = []

        for key, entry in self._cache.items():
            if entry.tool_name != tool_name:
                continue

            # Check if key matches filters
            if args_hash and args_hash not in key:
                continue
            if user_id and config.per_user and user_id not in key:
                continue

            to_remove.append(key)

        for key in to_remove:
            del self._cache[key]

        return len(to_remove)

    def _cleanup_expired(self) -> int:
        """Remove expired entries.

        Returns:
            Number of entries removed
        """
        now = datetime.now(timezone.utc)
        to_remove = [
            key for key, entry in self._cache.items()
            if entry.expires_at < now
        ]

        for key in to_remove:
            del self._cache[key]

        return len(to_remove)

    def _evict_oldest(self, count: int) -> int:
        """Evict oldest entries.

        Args:
            count: Number of entries to evict

        Returns:
            Number of entries evicted
        """
        if count <= 0:
            return 0

        sorted_entries = sorted(
            self._cache.items(),
            key=lambda x: x[1].created_at
        )

        to_remove = [key for key, _ in sorted_entries[:count]]
        for key in to_remove:
            del self._cache[key]

        return len(to_remove)

    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()

    def stats(self) -> dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dictionary with cache stats
        """
        now = datetime.now(timezone.utc)
        expired_count = sum(1 for e in self._cache.values() if e.expires_at < now)

        return {
            "total_entries": len(self._cache),
            "expired_entries": expired_count,
            "valid_entries": len(self._cache) - expired_count,
            "max_entries": self._max_entries,
        }


# Global cache instance
_cache: Optional[InMemoryCache] = None


def get_cache() -> InMemoryCache:
    """Get the global cache instance."""
    global _cache
    if _cache is None:
        _cache = InMemoryCache()
    return _cache


def hash_args(args: dict[str, Any]) -> str:
    """Create a hash of tool arguments for cache key.

    Args:
        args: Tool arguments dictionary

    Returns:
        MD5 hash of the arguments
    """
    # Sort keys for consistent hashing
    sorted_args = json.dumps(args, sort_keys=True, default=str)
    return hashlib.md5(sorted_args.encode()).hexdigest()


def is_error_result(result: Any) -> bool:
    """Check if a result is an error response.

    Args:
        result: Tool result

    Returns:
        True if the result appears to be an error
    """
    if isinstance(result, dict):
        return "error" in result or "code" in result
    return False


def cacheable(
    config: Optional[CacheConfig] = None,
    ttl: Optional[int] = None,
) -> Callable[[F], F]:
    """Decorator for caching tool results.

    Caches the result of a tool call based on its arguments. Results are
    cached per-user by default.

    Args:
        config: Cache configuration
        ttl: Override TTL in seconds

    Usage:
        @cacheable()  # Uses default config
        async def list_accounts(ctx):
            return await api.list_accounts()

        @cacheable(ttl=60)  # 1 minute TTL
        async def get_stats(ctx, date_range):
            return await api.get_stats(date_range)
    """
    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            effective_config = config or CacheConfig()
            if ttl is not None:
                effective_config = CacheConfig(
                    ttl_seconds=ttl,
                    key_prefix=effective_config.key_prefix,
                    per_user=effective_config.per_user,
                    skip_on_error=effective_config.skip_on_error,
                )

            # Extract context
            ctx = args[0] if args else kwargs.get("ctx")
            user_id = None
            if ctx:
                request_context = getattr(ctx, "request_context", {})
                if isinstance(request_context, dict):
                    user_id = request_context.get("user_id")

            # Create args hash (exclude context)
            cache_args = dict(kwargs)
            if len(args) > 1:
                cache_args["_positional"] = args[1:]
            args_hash = hash_args(cache_args)

            # Check cache
            cache = get_cache()
            entry = cache.get(func.__name__, args_hash, user_id, effective_config)

            if entry is not None:
                logger.debug(f"Cache hit for {func.__name__} (age: {entry.age_seconds:.1f}s)")
                return entry.value

            # Execute function
            result = await func(*args, **kwargs)

            # Cache result (unless it's an error)
            if effective_config.skip_on_error and is_error_result(result):
                logger.debug(f"Skipping cache for {func.__name__} (error result)")
            else:
                cache.set(func.__name__, args_hash, user_id, result, effective_config)
                logger.debug(f"Cached result for {func.__name__} (ttl: {effective_config.ttl_seconds}s)")

            return result
        return wrapper  # type: ignore
    return decorator


def invalidate_cache_for(
    tool_names: list[str],
    user_id: Optional[str] = None,
) -> Callable[[F], F]:
    """Decorator to invalidate cache after a mutation.

    Use on create/update/delete tools to invalidate related caches.

    Args:
        tool_names: List of tool names to invalidate
        user_id: Specific user to invalidate (or None for all)

    Usage:
        @invalidate_cache_for(["list_accounts", "get_account"])
        async def update_account(ctx, account_id, data):
            return await api.update_account(account_id, data)
    """
    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Execute the function first
            result = await func(*args, **kwargs)

            # Invalidate caches
            cache = get_cache()
            config = CacheConfig()

            for tool_name in tool_names:
                count = cache.invalidate(tool_name, user_id=user_id, config=config)
                if count > 0:
                    logger.debug(f"Invalidated {count} cache entries for {tool_name}")

            return result
        return wrapper  # type: ignore
    return decorator
