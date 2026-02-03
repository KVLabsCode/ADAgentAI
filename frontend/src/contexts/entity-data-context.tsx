"use client"

import * as React from "react"
import { createContext, useContext, useCallback, useState, useMemo } from "react"
import { fetchFieldOptions, FieldOption, FieldFilterParams } from "@/lib/api"
import { useUser } from "./user-context"
import { ENTITY_RELATIONSHIPS, EntityType } from "@/lib/entity-config"
import { sessionStore } from "@/lib/storage"

/** Cache TTL in milliseconds (10 minutes - entity data changes infrequently) */
const CACHE_TTL = 10 * 60 * 1000

/** Session storage key for persistent cache */
const STORAGE_KEY = 'entity_cache_data'

/** Get cached data from sessionStorage */
function getStoredCache(): EntityCache {
  const stored = sessionStore.get<Record<string, Record<string, CacheEntry>> | null>(STORAGE_KEY, null)
  if (!stored) return new Map()

  // Reconstruct Map structure from serialized data
  const cache: EntityCache = new Map()
  for (const [type, entries] of Object.entries(stored)) {
    const typeMap = new Map<string | null, CacheEntry>()
    for (const [key, entry] of Object.entries(entries)) {
      // Convert "null" string back to null
      const mapKey = key === '__null__' ? null : key
      typeMap.set(mapKey, entry)
    }
    cache.set(type, typeMap)
  }
  return cache
}

/** Save cache to sessionStorage */
function saveStoredCache(cache: EntityCache): void {
  // Convert Map structure to serializable object
  const serializable: Record<string, Record<string, CacheEntry>> = {}
  for (const [type, entries] of cache.entries()) {
    serializable[type] = {}
    for (const [key, entry] of entries.entries()) {
      // Convert null key to special string
      const mapKey = key === null ? '__null__' : key
      serializable[type][mapKey] = entry
    }
  }
  sessionStore.set(STORAGE_KEY, serializable)
}

export interface EntityItem {
  id: string
  name: string
  metadata?: Record<string, unknown>
  /** If true, item is disabled and cannot be selected */
  disabled?: boolean
  /** If true, show "Coming Soon" badge (implies disabled) */
  comingSoon?: boolean
}

interface CacheEntry {
  items: EntityItem[]
  timestamp: number
}

/** Cache structure: fetchType -> parentId -> CacheEntry */
type EntityCache = Map<string, Map<string | null, CacheEntry>>

interface EntityDataContextValue {
  /** Get cached entities (returns empty array if not cached) */
  getCachedEntities: (fetchType: string, parentId?: string | null, filters?: FieldFilterParams) => EntityItem[]

  /** Fetch entities (uses cache if fresh, fetches if stale/missing) */
  fetchEntities: (
    fetchType: string,
    parentId?: string | null,
    force?: boolean,
    filters?: FieldFilterParams
  ) => Promise<EntityItem[]>

  /** Check if currently loading a specific fetch */
  isLoading: (fetchType: string, parentId?: string | null, filters?: FieldFilterParams) => boolean

  /** Get any error for a specific fetch */
  getError: (fetchType: string, parentId?: string | null, filters?: FieldFilterParams) => string | null

  /** Get display name for an entity ID */
  getDisplayName: (fetchType: string, id: string, parentId?: string | null) => string

  /** Get multiple display names */
  getDisplayNames: (fetchType: string, ids: string[], parentId?: string | null) => string[]

  /** Clear all cache (e.g., on org change) */
  clearCache: () => void

  /** Clear cache for a specific entity type */
  clearEntityCache: (fetchType: string) => void

  /**
   * Phase 3 optimization: Prefetch all dependent entities in parallel when account is selected.
   * This reduces total form load time by fetching apps, ad_units, etc. simultaneously.
   */
  prefetchDependentEntities: (accountId: string, dependentTypes?: string[]) => Promise<void>
}

const EntityDataContext = createContext<EntityDataContextValue | null>(null)

export function EntityDataProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken, selectedOrganizationId } = useUser()

  // Main cache - initialize from sessionStorage
  const [cache, setCache] = useState<EntityCache>(() => getStoredCache())

  // Loading states: "fetchType:parentId" -> boolean
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(new Map())

  // Error states: "fetchType:parentId" -> string
  const [errorStates, setErrorStates] = useState<Map<string, string | null>>(new Map())

  // Generate cache key for loading/error states (includes filter params for uniqueness)
  const getCacheKey = useCallback((fetchType: string, parentId?: string | null, filters?: FieldFilterParams) => {
    const filterKey = filters
      ? `:${filters.platform || ""}:${filters.adFormat || ""}:${filters.appId || ""}`
      : ""
    return `${fetchType}:${parentId ?? "null"}${filterKey}`
  }, [])

  // Check if cache entry is fresh
  const isCacheFresh = useCallback((entry: CacheEntry | undefined): boolean => {
    if (!entry) return false
    return Date.now() - entry.timestamp < CACHE_TTL
  }, [])

  // Get cached entities
  const getCachedEntities = useCallback(
    (fetchType: string, parentId?: string | null, filters?: FieldFilterParams): EntityItem[] => {
      const key = getCacheKey(fetchType, parentId, filters)
      const typeCache = cache.get(fetchType)
      if (!typeCache) return []
      // For filtered queries, use the full key; for unfiltered, use parentId only
      const entry = filters
        ? typeCache.get(key)
        : typeCache.get(parentId ?? null)
      return entry?.items ?? []
    },
    [cache, getCacheKey]
  )

  // Convert FieldOption to EntityItem
  const toEntityItems = useCallback((options: FieldOption[]): EntityItem[] => {
    return options.map((opt) => ({
      id: opt.value,
      name: opt.label,
      disabled: opt.disabled,
      comingSoon: opt.comingSoon,
    }))
  }, [])

  // Fetch entities with caching
  const fetchEntities = useCallback(
    async (
      fetchType: string,
      parentId?: string | null,
      force: boolean = false,
      filters?: FieldFilterParams
    ): Promise<EntityItem[]> => {
      const key = getCacheKey(fetchType, parentId, filters)

      // Check cache first (unless force refresh)
      const typeCache = cache.get(fetchType)
      const cacheKey = filters ? key : (parentId ?? null)
      const entry = typeCache?.get(cacheKey)

      if (!force && isCacheFresh(entry)) {
        // Cache is fresh - return immediately without loading state
        return entry!.items
      }

      // Only show loading if we don't have ANY cached data to display
      const hasStaleData = entry && entry.items.length > 0
      if (!hasStaleData) {
        setLoadingStates((prev) => new Map(prev).set(key, true))
      }
      setErrorStates((prev) => new Map(prev).set(key, null))

      try {
        const accessToken = await getAccessToken()

        // Determine account_id parameter based on entity relationships
        let accountId: string | undefined
        if (parentId && ENTITY_RELATIONSHIPS[fetchType as EntityType]?.parent === "accounts") {
          accountId = parentId
        }

        const response = await fetchFieldOptions(
          fetchType,
          accessToken,
          accountId,
          selectedOrganizationId,
          filters // Pass filter params to API
        )

        const items = toEntityItems(response.options)

        // Update cache (use full key for filtered queries)
        // IMPORTANT: Also merge items into unfiltered cache so getDisplayNames works
        setCache((prev) => {
          const newCache = new Map(prev)
          if (!newCache.has(fetchType)) {
            newCache.set(fetchType, new Map())
          }
          const typeCache = newCache.get(fetchType)!
          const cacheKey = filters ? key : (parentId ?? null)
          typeCache.set(cacheKey, {
            items,
            timestamp: Date.now(),
          })

          // If filtered query, also merge items into unfiltered cache for name lookups
          // This ensures getDisplayNames can find names even when data was fetched with filters
          if (filters) {
            const unfilteredKey = parentId ?? null
            const existingUnfiltered = typeCache.get(unfilteredKey)
            if (existingUnfiltered) {
              // Merge new items into existing unfiltered cache (dedupe by id)
              const existingIds = new Set(existingUnfiltered.items.map(i => i.id))
              const newItems = items.filter(i => !existingIds.has(i.id))
              if (newItems.length > 0) {
                typeCache.set(unfilteredKey, {
                  items: [...existingUnfiltered.items, ...newItems],
                  timestamp: Date.now(),
                })
              }
            } else {
              // No unfiltered cache exists, create one with filtered items
              typeCache.set(unfilteredKey, {
                items,
                timestamp: Date.now(),
              })
            }
          }

          // Persist to sessionStorage
          saveStoredCache(newCache)
          return newCache
        })

        return items
      } catch (error) {
        console.error(`[entity-data-context] fetchEntities error for ${fetchType}:`, error)
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch"
        setErrorStates((prev) => new Map(prev).set(key, errorMessage))
        return []
      } finally {
        setLoadingStates((prev) => new Map(prev).set(key, false))
      }
    },
    [cache, getCacheKey, getAccessToken, isCacheFresh, selectedOrganizationId, toEntityItems]
  )

  // Check loading state
  const isLoading = useCallback(
    (fetchType: string, parentId?: string | null, filters?: FieldFilterParams): boolean => {
      const key = getCacheKey(fetchType, parentId, filters)
      return loadingStates.get(key) ?? false
    },
    [getCacheKey, loadingStates]
  )

  // Get error state
  const getError = useCallback(
    (fetchType: string, parentId?: string | null, filters?: FieldFilterParams): string | null => {
      const key = getCacheKey(fetchType, parentId, filters)
      return errorStates.get(key) ?? null
    },
    [getCacheKey, errorStates]
  )

  // Get display name for a single ID
  const getDisplayName = useCallback(
    (fetchType: string, id: string, parentId?: string | null): string => {
      const items = getCachedEntities(fetchType, parentId)
      const item = items.find((i) => i.id === id)
      return item?.name ?? id // Fallback to ID if not found
    },
    [getCachedEntities]
  )

  // Get display names for multiple IDs
  const getDisplayNames = useCallback(
    (fetchType: string, ids: string[], parentId?: string | null): string[] => {
      const items = getCachedEntities(fetchType, parentId)
      const itemMap = new Map(items.map((i) => [i.id, i.name]))
      return ids.map((id) => itemMap.get(id) ?? id)
    },
    [getCachedEntities]
  )

  // Clear all cache
  const clearCache = useCallback(() => {
    setCache(new Map())
    setLoadingStates(new Map())
    setErrorStates(new Map())
    // Also clear sessionStorage
    sessionStore.remove(STORAGE_KEY)
  }, [])

  // Clear cache for specific entity type
  const clearEntityCache = useCallback((fetchType: string) => {
    setCache((prev) => {
      const newCache = new Map(prev)
      newCache.delete(fetchType)
      // Persist to sessionStorage
      saveStoredCache(newCache)
      return newCache
    })
  }, [])

  // Phase 3 optimization: Prefetch all dependent entities in parallel
  // This fetches apps, ad_units, mediation_groups, and ad_sources simultaneously
  // when an account is selected, reducing total form load time by ~100ms
  const prefetchDependentEntities = useCallback(
    async (accountId: string, dependentTypes?: string[]) => {
      const typesToFetch = dependentTypes || [
        "apps",
        "ad_units",
        "mediation_groups",
        "bidding_ad_sources",
        "waterfall_ad_sources",
      ]

      // Fetch all in parallel without waiting
      await Promise.all(
        typesToFetch.map((type) => fetchEntities(type, accountId))
      )
    },
    [fetchEntities]
  )

  // Clear cache when organization changes
  React.useEffect(() => {
    clearCache()
  }, [selectedOrganizationId, clearCache])

  const value = useMemo<EntityDataContextValue>(
    () => ({
      getCachedEntities,
      fetchEntities,
      isLoading,
      getError,
      getDisplayName,
      getDisplayNames,
      clearCache,
      clearEntityCache,
      prefetchDependentEntities,
    }),
    [
      getCachedEntities,
      fetchEntities,
      isLoading,
      getError,
      getDisplayName,
      getDisplayNames,
      clearCache,
      clearEntityCache,
      prefetchDependentEntities,
    ]
  )

  return (
    <EntityDataContext.Provider value={value}>
      {children}
    </EntityDataContext.Provider>
  )
}

export function useEntityData() {
  const context = useContext(EntityDataContext)
  if (!context) {
    throw new Error("useEntityData must be used within an EntityDataProvider")
  }
  return context
}
