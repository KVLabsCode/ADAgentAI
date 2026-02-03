/**
 * In-memory cache for AdMob API responses
 *
 * Phase 4 optimization: Caches AdMob API responses to reduce latency
 * from ~150-300ms (API call) to ~20ms (cache hit).
 *
 * Default TTL: 5 minutes (entity data changes infrequently)
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

// Default TTL: 5 minutes
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Get cached data or fetch it if stale/missing
 *
 * @param key - Cache key (e.g., "apps:providerId" or "ad_units:providerId")
 * @param fetcher - Function to fetch data if not cached
 * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
 * @returns The cached or freshly fetched data
 */
export async function getCachedAdMobData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const cached = cache.get(key) as CacheEntry<T> | undefined;

  // Return cached data if not expired
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache the result
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs,
  });

  return data;
}

/**
 * Build a cache key for AdMob entity data
 *
 * @param entityType - Type of entity (apps, ad_units, mediation_groups, ad_sources)
 * @param accountId - AdMob account ID (publisherId)
 * @param filters - Optional filter params
 */
export function buildCacheKey(
  entityType: string,
  accountId: string,
  filters?: { platform?: string; adFormat?: string; appId?: string }
): string {
  let key = `${entityType}:${accountId}`;

  // Include filters in cache key for filtered queries
  if (filters) {
    if (filters.platform) key += `:platform=${filters.platform}`;
    if (filters.adFormat) key += `:adFormat=${filters.adFormat}`;
    if (filters.appId) key += `:appId=${filters.appId}`;
  }

  return key;
}

/**
 * Invalidate cache for a specific account
 * Call this when account data might have changed (e.g., after mutations)
 *
 * @param accountId - AdMob account ID (publisherId)
 */
export function invalidateAccountCache(accountId: string): void {
  const keysToDelete: string[] = [];

  for (const key of cache.keys()) {
    if (key.includes(`:${accountId}`)) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    cache.delete(key);
  }
}

/**
 * Clear entire cache
 * Useful for testing or when cache needs full refresh
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
