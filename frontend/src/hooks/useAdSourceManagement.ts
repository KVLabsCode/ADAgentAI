"use client"

import * as React from "react"
import { toast } from "sonner"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import type { AdSource, AdSourceConfig, AdSourceName } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface AdSourcesState {
  adSources: AdSource[]
  configs: Record<AdSourceName, AdSourceConfig> | null
  canManage: boolean
  isLoading: boolean
  connectingAdSource: AdSourceName | null
  togglingAdSource: string | null
}

export function useAdSourceManagement(providerId?: string) {
  const { getAccessToken, selectedOrganizationId, isAuthenticated, isLoading: isAuthLoading } = useUser()

  const [state, setState] = React.useState<AdSourcesState>({
    adSources: [],
    configs: null,
    canManage: true,
    isLoading: true,
    connectingAdSource: null,
    togglingAdSource: null,
  })

  // Track if we have a valid token to prevent race conditions
  const [hasToken, setHasToken] = React.useState(false)

  // Check for token availability when auth state changes
  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      getAccessToken().then(token => {
        if (token) {
          setHasToken(true)
        }
      })
    } else if (!isAuthenticated) {
      setHasToken(false)
    }
  }, [isAuthLoading, isAuthenticated, getAccessToken])

  // Fetch ad source configurations (field schemas)
  const fetchConfigs = React.useCallback(async () => {
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return

      const response = await authFetch(
        `${API_URL}/api/ad-sources/config`,
        accessToken,
        { cache: 'no-store' },
        selectedOrganizationId
      )

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({ ...prev, configs: data.adSources }))
      }
    } catch (error) {
      console.error('Failed to fetch ad source configs:', error)
    }
  }, [getAccessToken, selectedOrganizationId])

  // Fetch connected ad sources
  const fetchAdSources = React.useCallback(async () => {
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        // Don't set isLoading to false if we're still waiting for token
        return
      }

      // Build URL with optional provider filter
      const url = providerId
        ? `${API_URL}/api/ad-sources?providerId=${providerId}`
        : `${API_URL}/api/ad-sources`

      const response = await authFetch(
        url,
        accessToken,
        { cache: 'no-store' },
        selectedOrganizationId
      )

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          adSources: data.adSources,
          canManage: data.canManage === true,
          isLoading: false,
        }))
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error('Failed to fetch ad sources:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [getAccessToken, selectedOrganizationId, providerId])

  // Initialize on auth AND token ready
  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated && hasToken) {
      fetchConfigs()
      fetchAdSources()
    } else if (!isAuthLoading && !isAuthenticated) {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [fetchConfigs, fetchAdSources, isAuthLoading, isAuthenticated, hasToken])

  // Connect an ad source with credentials
  const handleConnect = React.useCallback(async (
    adSourceName: AdSourceName,
    credentials: Record<string, string>,
    targetProviderId?: string
  ) => {
    setState(prev => ({ ...prev, connectingAdSource: adSourceName }))

    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/ad-sources/${adSourceName}`,
        accessToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credentials,
            providerId: targetProviderId || providerId,
          }),
        },
        selectedOrganizationId
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to connect ad source')
      }

      const result = await response.json()

      setState(prev => ({
        ...prev,
        adSources: [
          ...prev.adSources.filter(s => s.adSourceName !== adSourceName),
          {
            id: result.id,
            adSourceName,
            displayName: result.displayName,
            isEnabled: true,
            connectedAt: new Date().toISOString(),
            providerId: result.providerId,
          },
        ],
        connectingAdSource: null,
      }))

      toast.success(`${result.displayName} connected successfully!`)
      return true
    } catch (error) {
      console.error('Connect error:', error)
      setState(prev => ({ ...prev, connectingAdSource: null }))
      toast.error(error instanceof Error ? error.message : 'Failed to connect ad source')
      return false
    }
  }, [getAccessToken, selectedOrganizationId, providerId])

  // Disconnect an ad source
  const handleDisconnect = React.useCallback(async (adSourceId: string) => {
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/ad-sources/${adSourceId}`,
        accessToken,
        { method: 'DELETE' },
        selectedOrganizationId
      )

      if (response.ok) {
        setState(prev => ({
          ...prev,
          adSources: prev.adSources.filter(s => s.id !== adSourceId),
        }))
        toast.success('Ad source disconnected')
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect ad source')
    }
  }, [getAccessToken, selectedOrganizationId])

  // Toggle ad source enabled/disabled
  const handleToggle = React.useCallback(async (adSourceId: string, enabled: boolean) => {
    setState(prev => ({ ...prev, togglingAdSource: adSourceId }))

    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/ad-sources/${adSourceId}/toggle`,
        accessToken,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isEnabled: enabled }),
        },
        selectedOrganizationId
      )

      if (response.ok) {
        setState(prev => ({
          ...prev,
          adSources: prev.adSources.map(s =>
            s.id === adSourceId ? { ...s, isEnabled: enabled } : s
          ),
          togglingAdSource: null,
        }))
      } else {
        throw new Error('Failed to toggle')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      setState(prev => ({ ...prev, togglingAdSource: null }))
      toast.error('Failed to update ad source. Please try again.')
    }
  }, [getAccessToken, selectedOrganizationId])

  // Verify credentials before connecting
  const handleVerify = React.useCallback(async (
    adSourceName: AdSourceName,
    credentials: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> => {
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/ad-sources/${adSourceName}/verify`,
        accessToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials }),
        },
        selectedOrganizationId
      )

      if (!response.ok) {
        return { valid: false, error: 'Verification failed' }
      }

      const data = await response.json()
      return { valid: data.valid, error: data.error }
    } catch {
      return { valid: false, error: 'Verification failed' }
    }
  }, [getAccessToken, selectedOrganizationId])

  // Check if an ad source is connected
  const isConnected = React.useCallback((adSourceName: AdSourceName): boolean => {
    return state.adSources.some(s => s.adSourceName === adSourceName)
  }, [state.adSources])

  // Get connected ad source by name
  const getAdSource = React.useCallback((adSourceName: AdSourceName): AdSource | undefined => {
    return state.adSources.find(s => s.adSourceName === adSourceName)
  }, [state.adSources])

  return {
    // Data
    adSources: state.adSources,
    configs: state.configs,
    canManage: state.canManage,
    // State
    isLoading: state.isLoading,
    connectingAdSource: state.connectingAdSource,
    togglingAdSource: state.togglingAdSource,
    // Actions
    handleConnect,
    handleDisconnect,
    handleToggle,
    handleVerify,
    // Helpers
    isConnected,
    getAdSource,
    refetch: fetchAdSources,
  }
}

// Legacy export for backward compatibility
export { useAdSourceManagement as useNetworkManagement }
