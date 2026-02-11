"use client"

import * as React from "react"
import { toast } from "sonner"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import type { Provider } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ProviderDetail extends Provider {
  publisherId?: string
  networkCode?: string
  accountName?: string
  connectedAt: string
  lastSyncAt?: string
}

interface ProviderDetailState {
  provider: ProviderDetail | null
  canManage: boolean
  isLoading: boolean
  togglingProvider: boolean
}

export function useProviderDetail(providerId: string | undefined) {
  const { getAccessToken, selectedOrganizationId, isAuthenticated, isLoading: isAuthLoading } = useUser()

  const [state, setState] = React.useState<ProviderDetailState>({
    provider: null,
    canManage: true,
    isLoading: true,
    togglingProvider: false,
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

  // Fetch provider details
  const fetchProvider = React.useCallback(async () => {
    if (!providerId) {
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        return
      }

      const response = await authFetch(
        `${API_URL}/api/providers/${providerId}`,
        accessToken,
        { cache: 'no-store' },
        selectedOrganizationId
      )

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          provider: {
            ...data.provider,
            status: 'connected',
            displayName: data.provider.name,
            identifiers: data.provider.type === 'admob'
              ? { publisherId: data.provider.publisherId }
              : { networkCode: data.provider.networkCode, accountName: data.provider.accountName },
          },
          canManage: data.canManage === true,
          isLoading: false,
        }))
      } else if (response.status === 404) {
        setState(prev => ({ ...prev, provider: null, isLoading: false }))
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error('Failed to fetch provider:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [getAccessToken, selectedOrganizationId, providerId])

  // Initialize on auth AND token ready
  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated && hasToken) {
      fetchProvider()
    } else if (!isAuthLoading && !isAuthenticated) {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [fetchProvider, isAuthLoading, isAuthenticated, hasToken])

  // Toggle provider enabled/disabled
  const handleToggleEnabled = React.useCallback(async (enabled: boolean) => {
    if (!providerId) return

    setState(prev => ({ ...prev, togglingProvider: true }))

    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/providers/${providerId}/toggle`,
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
          provider: prev.provider ? { ...prev.provider, isEnabled: enabled } : null,
          togglingProvider: false,
        }))
      } else {
        throw new Error('Failed to toggle')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      setState(prev => ({ ...prev, togglingProvider: false }))
      toast.error('Failed to update provider. Please try again.')
    }
  }, [getAccessToken, selectedOrganizationId, providerId])

  // Disconnect provider
  const handleDisconnect = React.useCallback(async () => {
    if (!providerId) return false

    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/providers/${providerId}`,
        accessToken,
        { method: 'DELETE' },
        selectedOrganizationId
      )

      if (response.ok) {
        setState(prev => ({ ...prev, provider: null }))
        toast.success('Provider disconnected')
        return true
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect provider.')
      return false
    }
  }, [getAccessToken, selectedOrganizationId, providerId])

  return {
    // Data
    provider: state.provider,
    canManage: state.canManage,
    // State
    isLoading: state.isLoading,
    togglingProvider: state.togglingProvider,
    // Actions
    handleToggleEnabled,
    handleDisconnect,
    refetch: fetchProvider,
  }
}
