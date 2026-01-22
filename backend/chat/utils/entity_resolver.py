"""
Entity Resolver - Enriches raw entity IDs with human-readable names.

This module provides a caching resolver that fetches entity names from the
internal API and builds ID → name mappings. Used by the tool executor to
enrich approval form data before displaying to users.

Key features:
- Long-term caching (10 min TTL) for performance
- Validates entity IDs exist in user's account
- Supports: ad_sources, ad_units, apps, mediation_groups
"""

import os
import time
from typing import TypedDict
import httpx

# Cache TTL in seconds (10 minutes as per design decision)
CACHE_TTL_SECONDS = 600


class ResolvedEntity(TypedDict):
    """Result of resolving an entity ID."""

    id: str
    name: str | None
    valid: bool


class CacheEntry(TypedDict):
    """Cache entry with timestamp for TTL checking."""

    data: dict[str, str]  # {id: name}
    timestamp: float


class EntityResolver:
    """Resolves entity IDs to human-readable names with caching.

    Usage:
        resolver = EntityResolver(provider_id="provider-uuid")
        resolved = await resolver.resolve_ad_source("5450213213706118123")
        # {'id': '5450213213706118123', 'name': 'AdMob Network', 'valid': True}
    """

    # Class-level cache shared across instances (per provider_id + entity_type)
    _cache: dict[str, CacheEntry] = {}

    def __init__(self, provider_id: str):
        """Initialize resolver with provider context.

        Args:
            provider_id: UUID of the connected provider (from connected_providers table)
        """
        self.provider_id = provider_id
        self.api_url = os.environ.get("API_URL", "http://localhost:3001")
        self.internal_api_key = os.environ.get("INTERNAL_API_KEY", "")

    def _cache_key(self, entity_type: str) -> str:
        """Generate cache key for entity type."""
        return f"{self.provider_id}:{entity_type}"

    def _is_cache_valid(self, key: str) -> bool:
        """Check if cache entry exists and is within TTL."""
        entry = self._cache.get(key)
        if not entry:
            return False
        age = time.time() - entry["timestamp"]
        return age < CACHE_TTL_SECONDS

    async def resolve_ad_source(self, ad_source_id: str) -> ResolvedEntity:
        """Resolve ad source ID to name.

        Args:
            ad_source_id: The ad source ID (e.g., "5450213213706118123")

        Returns:
            ResolvedEntity with id, name, and valid flag
        """
        cache_key = self._cache_key("ad_sources")
        if not self._is_cache_valid(cache_key):
            await self._fetch_ad_sources()

        cache_data = self._cache.get(cache_key, {}).get("data", {})
        name = cache_data.get(ad_source_id)

        return {"id": ad_source_id, "name": name, "valid": name is not None}

    async def resolve_ad_unit(self, ad_unit_id: str) -> ResolvedEntity:
        """Resolve ad unit ID to name.

        Args:
            ad_unit_id: The ad unit ID (e.g., "ca-app-pub-xxx/123456")

        Returns:
            ResolvedEntity with id, name, and valid flag
        """
        cache_key = self._cache_key("ad_units")
        if not self._is_cache_valid(cache_key):
            await self._fetch_ad_units()

        cache_data = self._cache.get(cache_key, {}).get("data", {})
        name = cache_data.get(ad_unit_id)

        return {"id": ad_unit_id, "name": name, "valid": name is not None}

    async def resolve_app(self, app_id: str) -> ResolvedEntity:
        """Resolve app ID to name.

        Args:
            app_id: The app ID (e.g., "ca-app-pub-xxx~yyy")

        Returns:
            ResolvedEntity with id, name, and valid flag
        """
        cache_key = self._cache_key("apps")
        if not self._is_cache_valid(cache_key):
            await self._fetch_apps()

        cache_data = self._cache.get(cache_key, {}).get("data", {})
        name = cache_data.get(app_id)

        return {"id": app_id, "name": name, "valid": name is not None}

    async def resolve_mediation_group(self, mediation_group_id: str) -> ResolvedEntity:
        """Resolve mediation group ID to name.

        Args:
            mediation_group_id: The mediation group ID

        Returns:
            ResolvedEntity with id, name, and valid flag
        """
        cache_key = self._cache_key("mediation_groups")
        if not self._is_cache_valid(cache_key):
            await self._fetch_mediation_groups()

        cache_data = self._cache.get(cache_key, {}).get("data", {})
        name = cache_data.get(mediation_group_id)

        return {"id": mediation_group_id, "name": name, "valid": name is not None}

    async def _fetch_ad_sources(self) -> None:
        """Fetch all ad sources for the provider and cache them."""
        await self._fetch_and_cache(
            entity_type="ad_sources",
            endpoint="/api/providers/internal/ad-sources",
            response_key="adSources",
            id_field="value",  # API returns {value, label}
            name_field="label",
        )

    async def _fetch_ad_units(self) -> None:
        """Fetch all ad units for the provider and cache them."""
        await self._fetch_and_cache(
            entity_type="ad_units",
            endpoint="/api/providers/internal/ad-units",
            response_key="adUnits",
            id_field="value",
            name_field="label",
        )

    async def _fetch_apps(self) -> None:
        """Fetch all apps for the provider and cache them."""
        await self._fetch_and_cache(
            entity_type="apps",
            endpoint="/api/providers/internal/apps",
            response_key="apps",
            id_field="value",
            name_field="label",
        )

    async def _fetch_mediation_groups(self) -> None:
        """Fetch all mediation groups for the provider and cache them."""
        await self._fetch_and_cache(
            entity_type="mediation_groups",
            endpoint="/api/providers/internal/mediation-groups",
            response_key="mediationGroups",
            id_field="value",
            name_field="label",
        )

    async def _fetch_and_cache(
        self,
        entity_type: str,
        endpoint: str,
        response_key: str,
        id_field: str,
        name_field: str,
    ) -> None:
        """Generic fetch and cache method for any entity type.

        Args:
            entity_type: Type of entity for cache key
            endpoint: API endpoint to call
            response_key: Key in response JSON containing the array
            id_field: Field name for entity ID in response items
            name_field: Field name for entity name in response items
        """
        cache_key = self._cache_key(entity_type)

        if not self.internal_api_key:
            print(f"[entity_resolver] Missing INTERNAL_API_KEY, cannot fetch {entity_type}")
            self._cache[cache_key] = {"data": {}, "timestamp": time.time()}
            return

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(
                    f"{self.api_url}{endpoint}",
                    params={"providerId": self.provider_id},
                    headers={"x-internal-api-key": self.internal_api_key},
                )

                if response.status_code == 200:
                    data = response.json()
                    items = data.get(response_key, [])

                    # Build ID → name mapping
                    id_to_name: dict[str, str] = {}
                    for item in items:
                        entity_id = item.get(id_field)
                        entity_name = item.get(name_field)
                        if entity_id and entity_name:
                            id_to_name[entity_id] = entity_name

                    self._cache[cache_key] = {
                        "data": id_to_name,
                        "timestamp": time.time(),
                    }
                    print(
                        f"[entity_resolver] Cached {len(id_to_name)} {entity_type} "
                        f"for provider {self.provider_id[:8]}..."
                    )
                else:
                    print(
                        f"[entity_resolver] Failed to fetch {entity_type}: "
                        f"status={response.status_code}"
                    )
                    # Cache empty result to avoid repeated failed requests
                    self._cache[cache_key] = {"data": {}, "timestamp": time.time()}

        except Exception as e:
            print(f"[entity_resolver] Error fetching {entity_type}: {e}")
            # Cache empty result on error
            self._cache[cache_key] = {"data": {}, "timestamp": time.time()}

    @classmethod
    def clear_cache(cls, provider_id: str | None = None) -> None:
        """Clear cached entity data.

        Args:
            provider_id: If provided, only clear cache for this provider.
                        If None, clear all cached data.
        """
        if provider_id:
            keys_to_remove = [k for k in cls._cache if k.startswith(f"{provider_id}:")]
            for key in keys_to_remove:
                del cls._cache[key]
            print(f"[entity_resolver] Cleared cache for provider {provider_id[:8]}...")
        else:
            cls._cache.clear()
            print("[entity_resolver] Cleared all cache")


async def get_resolver_for_account(
    account_id: str, user_id: str, organization_id: str | None
) -> EntityResolver | None:
    """Get an EntityResolver for a given account ID.

    Looks up the provider_id from the account identifier (pub-xxx).

    Args:
        account_id: AdMob account identifier (e.g., "pub-1234567890123456")
        user_id: User ID for provider lookup
        organization_id: Organization context

    Returns:
        EntityResolver instance, or None if provider not found
    """
    from chat.utils.providers import get_user_providers

    providers = await get_user_providers(user_id, organization_id)
    provider = next(
        (p for p in providers if p.get("identifier") == account_id),
        None,
    )

    if not provider or not provider.get("id"):
        print(f"[entity_resolver] Provider not found for account {account_id}")
        return None

    return EntityResolver(provider_id=provider["id"])
