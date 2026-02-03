import { useState, useCallback } from "react"
import type { ProviderApp } from "@/lib/types"
import { authFetch } from "@/lib/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface UseProviderAppsOptions {
  enabledAppIds: Record<string, string[]>
  setEnabledAppIds: (providerId: string, appIds: string[]) => void
  getAccessToken: () => Promise<string | null>
}

interface UseProviderAppsReturn {
  providerApps: Record<string, ProviderApp[]>
  loadingApps: Set<string>
  fetchApps: (providerId: string) => Promise<void>
  isLoading: (providerId: string) => boolean
  getApps: (providerId: string) => ProviderApp[]
}

/**
 * Manages app fetching and caching for providers.
 * Fetches apps on demand when a provider is expanded.
 */
export function useProviderApps({
  enabledAppIds,
  setEnabledAppIds,
  getAccessToken,
}: UseProviderAppsOptions): UseProviderAppsReturn {
  const [providerApps, setProviderApps] = useState<Record<string, ProviderApp[]>>({})
  const [loadingApps, setLoadingApps] = useState<Set<string>>(new Set())

  const fetchApps = useCallback(
    async (providerId: string) => {
      // Skip if already loaded or currently loading
      if (providerApps[providerId] || loadingApps.has(providerId)) return

      setLoadingApps((prev) => new Set(prev).add(providerId))

      try {
        const accessToken = await getAccessToken()
        const response = await authFetch(
          `${API_URL}/api/providers/${providerId}/apps`,
          accessToken
        )

        if (response.ok) {
          const data = await response.json()
          setProviderApps((prev) => ({ ...prev, [providerId]: data.apps || [] }))

          // Initialize all apps as enabled if not already set
          if (!enabledAppIds[providerId]) {
            const allAppIds = (data.apps || []).map((app: ProviderApp) => app.id)
            setEnabledAppIds(providerId, allAppIds)
          }
        }
      } catch (error) {
        console.error("Failed to fetch apps:", error)
      } finally {
        setLoadingApps((prev) => {
          const next = new Set(prev)
          next.delete(providerId)
          return next
        })
      }
    },
    [providerApps, loadingApps, enabledAppIds, setEnabledAppIds, getAccessToken]
  )

  const isLoading = useCallback(
    (providerId: string) => loadingApps.has(providerId),
    [loadingApps]
  )

  const getApps = useCallback(
    (providerId: string) => providerApps[providerId] || [],
    [providerApps]
  )

  return {
    providerApps,
    loadingApps,
    fetchApps,
    isLoading,
    getApps,
  }
}
