"use client"

import { useQuery } from "@tanstack/react-query"
import { authFetch } from "@/lib/api"
import { useUser } from "@/hooks/use-user"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface DashboardProvider {
  id: string
  type: "admob" | "gam"
  name: string
}

export interface DashboardSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface DashboardData {
  providers: DashboardProvider[]
  sessions: DashboardSession[]
}

/**
 * Fetch dashboard data with React Query
 * Provides automatic caching, deduplication, and background refetching
 */
export function useDashboardData() {
  const { getAccessToken, selectedOrganizationId, isLoading: isUserLoading } = useUser()

  return useQuery({
    // Include org in key for cache isolation per org
    queryKey: ['dashboard', selectedOrganizationId],
    queryFn: async (): Promise<DashboardData> => {
      const accessToken = await getAccessToken()

      const [providersRes, sessionsRes] = await Promise.all([
        authFetch(`${API_URL}/api/providers`, accessToken, {}, selectedOrganizationId),
        authFetch(`${API_URL}/api/chat/sessions`, accessToken, {}, selectedOrganizationId),
      ])

      const providers = providersRes.ok
        ? ((await providersRes.json()).providers || [])
        : []

      const sessions = sessionsRes.ok
        ? ((await sessionsRes.json()).sessions || [])
        : []

      return { providers, sessions }
    },
    // Don't fetch until user is loaded
    enabled: !isUserLoading,
    // Keep data fresh for 2 minutes
    staleTime: 2 * 60 * 1000,
    // Cache data for 10 minutes even when stale
    gcTime: 10 * 60 * 1000,
    // Refetch on window focus after 30s
    refetchOnWindowFocus: true,
    // Retry failed requests
    retry: 1,
  })
}
