"use client"

import * as React from "react"
import { createContext, useContext, useCallback, useState, useMemo } from "react"
import { fetchFieldOptions, FieldOption } from "@/lib/api"
import { useUser } from "./user-context"
import { ENTITY_RELATIONSHIPS, EntityType } from "@/lib/entity-config"

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL = 5 * 60 * 1000

export interface EntityItem {
  id: string
  name: string
  metadata?: Record<string, unknown>
}

interface CacheEntry {
  items: EntityItem[]
  timestamp: number
}

/** Cache structure: fetchType -> parentId -> CacheEntry */
type EntityCache = Map<string, Map<string | null, CacheEntry>>

interface EntityDataContextValue {
  /** Get cached entities (returns empty array if not cached) */
  getCachedEntities: (fetchType: string, parentId?: string | null) => EntityItem[]

  /** Fetch entities (uses cache if fresh, fetches if stale/missing) */
  fetchEntities: (
    fetchType: string,
    parentId?: string | null,
    force?: boolean
  ) => Promise<EntityItem[]>

  /** Check if currently loading a specific fetch */
  isLoading: (fetchType: string, parentId?: string | null) => boolean

  /** Get any error for a specific fetch */
  getError: (fetchType: string, parentId?: string | null) => string | null

  /** Get display name for an entity ID */
  getDisplayName: (fetchType: string, id: string, parentId?: string | null) => string

  /** Get multiple display names */
  getDisplayNames: (fetchType: string, ids: string[], parentId?: string | null) => string[]

  /** Clear all cache (e.g., on org change) */
  clearCache: () => void

  /** Clear cache for a specific entity type */
  clearEntityCache: (fetchType: string) => void
}

const EntityDataContext = createContext<EntityDataContextValue | null>(null)

export function EntityDataProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken, selectedOrganizationId } = useUser()

  // Main cache
  const [cache, setCache] = useState<EntityCache>(new Map())

  // Loading states: "fetchType:parentId" -> boolean
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(new Map())

  // Error states: "fetchType:parentId" -> string
  const [errorStates, setErrorStates] = useState<Map<string, string | null>>(new Map())

  // Generate cache key for loading/error states
  const getCacheKey = useCallback((fetchType: string, parentId?: string | null) => {
    return `${fetchType}:${parentId ?? "null"}`
  }, [])

  // Check if cache entry is fresh
  const isCacheFresh = useCallback((entry: CacheEntry | undefined): boolean => {
    if (!entry) return false
    return Date.now() - entry.timestamp < CACHE_TTL
  }, [])

  // Get cached entities
  const getCachedEntities = useCallback(
    (fetchType: string, parentId?: string | null): EntityItem[] => {
      const typeCache = cache.get(fetchType)
      if (!typeCache) return []
      const entry = typeCache.get(parentId ?? null)
      return entry?.items ?? []
    },
    [cache]
  )

  // Convert FieldOption to EntityItem
  const toEntityItems = useCallback((options: FieldOption[]): EntityItem[] => {
    return options.map((opt) => ({
      id: opt.value,
      name: opt.label,
    }))
  }, [])

  // Fetch entities with caching
  const fetchEntities = useCallback(
    async (
      fetchType: string,
      parentId?: string | null,
      force: boolean = false
    ): Promise<EntityItem[]> => {
      const key = getCacheKey(fetchType, parentId)

      // Check cache first (unless force refresh)
      if (!force) {
        const typeCache = cache.get(fetchType)
        const entry = typeCache?.get(parentId ?? null)
        if (isCacheFresh(entry)) {
          return entry!.items
        }
      }

      // Set loading state
      setLoadingStates((prev) => new Map(prev).set(key, true))
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
          selectedOrganizationId
        )

        const items = toEntityItems(response.options)

        // Update cache
        setCache((prev) => {
          const newCache = new Map(prev)
          if (!newCache.has(fetchType)) {
            newCache.set(fetchType, new Map())
          }
          newCache.get(fetchType)!.set(parentId ?? null, {
            items,
            timestamp: Date.now(),
          })
          return newCache
        })

        return items
      } catch (error) {
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
    (fetchType: string, parentId?: string | null): boolean => {
      const key = getCacheKey(fetchType, parentId)
      return loadingStates.get(key) ?? false
    },
    [getCacheKey, loadingStates]
  )

  // Get error state
  const getError = useCallback(
    (fetchType: string, parentId?: string | null): string | null => {
      const key = getCacheKey(fetchType, parentId)
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
  }, [])

  // Clear cache for specific entity type
  const clearEntityCache = useCallback((fetchType: string) => {
    setCache((prev) => {
      const newCache = new Map(prev)
      newCache.delete(fetchType)
      return newCache
    })
  }, [])

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
