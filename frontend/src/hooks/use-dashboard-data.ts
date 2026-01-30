"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { authFetch } from "@/lib/api"
import { useUser } from "@/hooks/use-user"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface DashboardProvider {
  id: string
  type: "admob" | "gam"
  name: string
}

export interface DashboardAdSource {
  id: string
  adSourceName: string
  displayName: string
  isEnabled: boolean
  providerId?: string
}

// Legacy alias
export type DashboardNetwork = DashboardAdSource

export interface DashboardSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface DashboardData {
  providers: DashboardProvider[]
  adSources: DashboardAdSource[]
  // Legacy alias
  networks: DashboardAdSource[]
  sessions: DashboardSession[]
}

/**
 * Fetch dashboard data with React Query
 * Provides automatic caching, deduplication, and background refetching
 */
export function useDashboardData() {
  const { getAccessToken, selectedOrganizationId, isLoading: isUserLoading, isAuthenticated } = useUser()

  // Track if we've successfully gotten a token at least once
  // This prevents the query from running before the session token is ready
  const [hasToken, setHasToken] = React.useState(false)

  // Check for token availability when auth state changes
  React.useEffect(() => {
    if (!isUserLoading && isAuthenticated) {
      getAccessToken().then(token => {
        if (token) {
          setHasToken(true)
        }
      })
    } else if (!isAuthenticated) {
      setHasToken(false)
    }
  }, [isUserLoading, isAuthenticated, getAccessToken])

  return useQuery({
    // Include org in key for cache isolation per org
    queryKey: ['dashboard', selectedOrganizationId],
    queryFn: async (): Promise<DashboardData> => {
      const accessToken = await getAccessToken()

      // If token is still not available, throw to trigger retry
      if (!accessToken) {
        throw new Error('Access token not available yet')
      }

      const [providersRes, adSourcesRes, sessionsRes] = await Promise.all([
        authFetch(`${API_URL}/api/providers`, accessToken, {}, selectedOrganizationId),
        authFetch(`${API_URL}/api/ad-sources`, accessToken, {}, selectedOrganizationId),
        authFetch(`${API_URL}/api/chat/sessions`, accessToken, {}, selectedOrganizationId),
      ])

      const providers = providersRes.ok
        ? ((await providersRes.json()).providers || [])
        : []

      const adSources = adSourcesRes.ok
        ? ((await adSourcesRes.json()).adSources || [])
        : []

      const sessions = sessionsRes.ok
        ? ((await sessionsRes.json()).sessions || [])
        : []

      return { providers, adSources, networks: adSources, sessions }
    },
    // Don't fetch until user is loaded AND authenticated AND we have a token
    // This prevents race condition where query runs before session token is ready
    enabled: !isUserLoading && isAuthenticated && hasToken,
    // Keep previous data when query is disabled (e.g., during navigation)
    // Prevents flickering to 0 when isAuthenticated briefly changes
    placeholderData: (previousData) => previousData,
    // Keep data fresh for 2 minutes
    staleTime: 2 * 60 * 1000,
    // Cache data for 10 minutes even when stale
    gcTime: 10 * 60 * 1000,
    // Refetch on window focus after 30s
    refetchOnWindowFocus: true,
    // Retry failed requests (will retry if token wasn't ready)
    retry: 2,
    // Retry faster for token-related failures
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 3000),
  })
}
