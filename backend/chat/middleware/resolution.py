"""Resolution middleware for converting entity IDs to human-readable names.

Resolves entity IDs (e.g., ad_source_id: "5450213213312344435") to display names
(e.g., _resolved_ad_source_name: "AdMob Network") for approval form display.

Flow:
    1. Tool call args come in with raw IDs
    2. Middleware checks resolution rules for the tool
    3. Fetches entity names from cache/API
    4. Adds _resolved_* fields for UI display
    5. Marks invalid IDs with _valid = False
    6. Original IDs are preserved for API calls
"""

from dataclasses import dataclass
from typing import Optional, Callable, Awaitable
from datetime import datetime, timedelta, timezone
import asyncio


@dataclass
class ResolutionRule:
    """Rule for resolving a field to a human-readable name.

    Attributes:
        field: The field name to resolve (e.g., "ad_source_id")
        entity_type: Entity registry key (e.g., "admob_ad_sources")
        display_field: Field on entity to use for display (e.g., "title")
        required: Whether the field must resolve to a valid entity
    """
    field: str
    entity_type: str
    display_field: str = "name"
    required: bool = False


@dataclass
class CachedEntity:
    """Cached entity with TTL."""
    data: dict
    expires_at: datetime


class EntityCache:
    """Simple in-memory cache for entity lookups.

    Caches entity data to avoid repeated API calls during resolution.
    Each entity type can have different TTLs.

    Usage:
        cache = EntityCache(default_ttl=300)  # 5 minute default

        # Store entity
        cache.set("admob_ad_sources", "123", {"id": "123", "title": "AdMob"})

        # Retrieve entity
        entity = cache.get("admob_ad_sources", "123")

        # Bulk store
        cache.set_many("admob_ad_sources", [
            {"id": "123", "title": "AdMob"},
            {"id": "456", "title": "Meta"},
        ], id_field="id")
    """

    def __init__(self, default_ttl: int = 300):
        """Initialize cache.

        Args:
            default_ttl: Default TTL in seconds (5 minutes)
        """
        self._cache: dict[str, dict[str, CachedEntity]] = {}
        self._default_ttl = default_ttl
        self._ttls: dict[str, int] = {}

    def set_ttl(self, entity_type: str, ttl: int) -> None:
        """Set custom TTL for an entity type."""
        self._ttls[entity_type] = ttl

    def _get_ttl(self, entity_type: str) -> int:
        """Get TTL for entity type."""
        return self._ttls.get(entity_type, self._default_ttl)

    def get(self, entity_type: str, entity_id: str) -> Optional[dict]:
        """Get entity from cache if not expired.

        Args:
            entity_type: Type key (e.g., "admob_ad_sources")
            entity_id: Entity ID

        Returns:
            Entity data dict or None if not found/expired
        """
        type_cache = self._cache.get(entity_type, {})
        cached = type_cache.get(entity_id)

        if not cached:
            return None

        if datetime.now(timezone.utc) > cached.expires_at:
            # Expired, remove from cache
            del type_cache[entity_id]
            return None

        return cached.data

    def set(
        self,
        entity_type: str,
        entity_id: str,
        data: dict,
        ttl: Optional[int] = None,
    ) -> None:
        """Store entity in cache.

        Args:
            entity_type: Type key
            entity_id: Entity ID
            data: Entity data dict
            ttl: Optional custom TTL in seconds
        """
        if entity_type not in self._cache:
            self._cache[entity_type] = {}

        actual_ttl = ttl if ttl is not None else self._get_ttl(entity_type)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=actual_ttl)

        self._cache[entity_type][entity_id] = CachedEntity(
            data=data,
            expires_at=expires_at,
        )

    def set_many(
        self,
        entity_type: str,
        entities: list[dict],
        id_field: str = "id",
        ttl: Optional[int] = None,
    ) -> None:
        """Store multiple entities from a list response.

        Args:
            entity_type: Type key
            entities: List of entity dicts
            id_field: Field containing the entity ID
            ttl: Optional custom TTL
        """
        for entity in entities:
            entity_id = entity.get(id_field)
            if entity_id:
                self.set(entity_type, str(entity_id), entity, ttl)

    def invalidate(self, entity_type: str, entity_id: Optional[str] = None) -> None:
        """Invalidate cache entries.

        Args:
            entity_type: Type key
            entity_id: Specific entity ID (or None to invalidate all of type)
        """
        if entity_type not in self._cache:
            return

        if entity_id:
            self._cache[entity_type].pop(entity_id, None)
        else:
            self._cache[entity_type].clear()

    def clear(self) -> None:
        """Clear all cached entities."""
        self._cache.clear()


# Type for entity fetcher functions
EntityFetcher = Callable[[str, dict], Awaitable[Optional[dict]]]


class ResolutionMiddleware:
    """Middleware for resolving entity IDs to human-readable names.

    Adds _resolved_* and _*_valid fields to tool args for approval form display.
    Original IDs are preserved for API calls.

    Usage:
        middleware = ResolutionMiddleware(cache)

        # Register fetcher for entity type
        middleware.register_fetcher("admob_ad_sources", fetch_ad_sources)

        # Resolve tool args
        enriched = await middleware.resolve(
            tool_name="admob_create_mediation_group",
            args={"ad_source_id": "123"},
            context={"user_id": "user123", "account_id": "pub-123"},
            rules=[ResolutionRule(field="ad_source_id", entity_type="admob_ad_sources")]
        )
        # Result: {
        #     "ad_source_id": "123",
        #     "_resolved_ad_source_id": "AdMob Network",
        #     "_ad_source_id_valid": True
        # }
    """

    def __init__(self, cache: Optional[EntityCache] = None):
        """Initialize middleware.

        Args:
            cache: Entity cache instance (creates new if None)
        """
        self.cache = cache or EntityCache()
        self._fetchers: dict[str, EntityFetcher] = {}
        self._tool_rules: dict[str, list[ResolutionRule]] = {}

    def register_fetcher(
        self,
        entity_type: str,
        fetcher: EntityFetcher,
    ) -> None:
        """Register a fetcher function for an entity type.

        The fetcher receives (entity_id, context) and returns entity dict or None.

        Args:
            entity_type: Entity registry key
            fetcher: Async function to fetch entity by ID
        """
        self._fetchers[entity_type] = fetcher

    def register_rules(
        self,
        tool_name: str,
        rules: list[ResolutionRule],
    ) -> None:
        """Register resolution rules for a tool.

        Args:
            tool_name: Tool name (e.g., "admob_create_mediation_group")
            rules: List of resolution rules for tool's fields
        """
        self._tool_rules[tool_name] = rules

    def get_rules(self, tool_name: str) -> list[ResolutionRule]:
        """Get resolution rules for a tool."""
        return self._tool_rules.get(tool_name, [])

    async def _fetch_entity(
        self,
        entity_type: str,
        entity_id: str,
        context: dict,
    ) -> Optional[dict]:
        """Fetch entity, using cache if available.

        Args:
            entity_type: Entity registry key
            entity_id: Entity ID to fetch
            context: Context dict (user_id, account_id, etc.)

        Returns:
            Entity dict or None if not found
        """
        # Check cache first
        cached = self.cache.get(entity_type, entity_id)
        if cached is not None:
            return cached

        # Fetch via registered fetcher
        fetcher = self._fetchers.get(entity_type)
        if not fetcher:
            return None

        try:
            entity = await fetcher(entity_id, context)
            if entity:
                self.cache.set(entity_type, entity_id, entity)
            return entity
        except Exception:
            return None

    async def resolve(
        self,
        tool_name: str,
        args: dict,
        context: dict,
        rules: Optional[list[ResolutionRule]] = None,
    ) -> dict:
        """Resolve entity IDs to human-readable names.

        Adds _resolved_* and _*_valid fields to args. Original IDs are preserved.

        Args:
            tool_name: Tool name for looking up registered rules
            args: Tool arguments with entity IDs
            context: Context dict for fetchers (user_id, account_id, etc.)
            rules: Optional explicit rules (overrides registered rules)

        Returns:
            Enriched args dict with resolution fields
        """
        # Get rules (explicit or registered)
        resolution_rules = rules or self.get_rules(tool_name)
        if not resolution_rules:
            return args

        enriched = dict(args)

        # Process each rule
        for rule in resolution_rules:
            field_value = args.get(rule.field)
            if field_value is None:
                continue

            # Handle single ID or list of IDs
            is_list = isinstance(field_value, list)
            ids = field_value if is_list else [field_value]

            # Resolve all IDs concurrently
            tasks = [
                self._fetch_entity(rule.entity_type, str(id_val), context)
                for id_val in ids
            ]
            entities = await asyncio.gather(*tasks)

            # Extract display names and validity
            resolved_names = []
            valid_flags = []

            for id_val, entity in zip(ids, entities):
                if entity:
                    name = entity.get(rule.display_field, str(id_val))
                    resolved_names.append(name)
                    valid_flags.append(True)
                else:
                    resolved_names.append(f"Unknown ({id_val})")
                    valid_flags.append(False)

            # Add resolved fields
            resolved_key = f"_resolved_{rule.field}"
            valid_key = f"_{rule.field}_valid"

            if is_list:
                enriched[resolved_key] = resolved_names
                enriched[valid_key] = valid_flags
            else:
                enriched[resolved_key] = resolved_names[0]
                enriched[valid_key] = valid_flags[0]

        return enriched

    async def resolve_batch(
        self,
        tool_calls: list[dict],
        context: dict,
    ) -> list[dict]:
        """Resolve multiple tool calls.

        Args:
            tool_calls: List of {"name": str, "args": dict}
            context: Shared context for fetchers

        Returns:
            List of enriched args dicts
        """
        tasks = [
            self.resolve(tc["name"], tc["args"], context)
            for tc in tool_calls
        ]
        return await asyncio.gather(*tasks)


# Pre-configured rules for common tools
# Includes both curated names and Discovery-generated names
DEFAULT_RESOLUTION_RULES: dict[str, list[ResolutionRule]] = {
    # AdMob tools - curated names
    "admob_create_mediation_group": [
        ResolutionRule(
            field="ad_source_id",
            entity_type="admob_ad_sources",
            display_field="title",
        ),
        ResolutionRule(
            field="ad_unit_ids",
            entity_type="admob_ad_units",
            display_field="displayName",
        ),
    ],
    "admob_update_mediation_group": [
        ResolutionRule(
            field="ad_source_id",
            entity_type="admob_ad_sources",
            display_field="title",
        ),
    ],
    "admob_create_ad_unit": [
        ResolutionRule(
            field="app_id",
            entity_type="admob_apps",
            display_field="name",
        ),
    ],
    # AdMob tools - Discovery-generated names (accounts_X_Y pattern)
    "accounts_mediationGroups_create": [
        ResolutionRule(
            field="ad_source_id",
            entity_type="admob_ad_sources",
            display_field="title",
        ),
        ResolutionRule(
            field="ad_unit_ids",
            entity_type="admob_ad_units",
            display_field="displayName",
        ),
    ],
    "accounts_mediationGroups_patch": [
        ResolutionRule(
            field="ad_source_id",
            entity_type="admob_ad_sources",
            display_field="title",
        ),
    ],
    "accounts_adUnits_create": [
        ResolutionRule(
            field="app_id",
            entity_type="admob_apps",
            display_field="name",
        ),
    ],
}


def create_resolution_middleware() -> ResolutionMiddleware:
    """Create a resolution middleware with default configuration.

    Returns:
        Configured ResolutionMiddleware instance
    """
    cache = EntityCache(default_ttl=300)  # 5 minute cache
    middleware = ResolutionMiddleware(cache)

    # Register default rules
    for tool_name, rules in DEFAULT_RESOLUTION_RULES.items():
        middleware.register_rules(tool_name, rules)

    return middleware
