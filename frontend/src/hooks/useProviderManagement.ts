"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useUser } from "@/hooks/use-user"
import { useDemo } from "@/contexts/demo-mode-context"
import { authFetch } from "@/lib/api"
import { getDemoProviders } from "@/lib/demo-user"
import type { Provider, OAuthAccount } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface ProviderWithEnabled extends Provider {
  isEnabled: boolean
}

export function useProviderManagement() {
  const searchParams = useSearchParams()
  const { getAccessToken, selectedOrganizationId, isAuthenticated, isLoading: isAuthLoading } = useUser()
  const { isDemoMode } = useDemo()

  // In demo mode, use mock providers
  const demoProviders: ProviderWithEnabled[] = React.useMemo(() =>
    getDemoProviders().map(p => ({ ...p, isEnabled: true })),
  [])

  const [providers, setProviders] = React.useState<ProviderWithEnabled[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [connectingType, setConnectingType] = React.useState<string | null>(null)
  const [accountSelectionOpen, setAccountSelectionOpen] = React.useState(false)
  const [pendingAccounts, setPendingAccounts] = React.useState<OAuthAccount[]>([])
  const [canManage, setCanManage] = React.useState<boolean | null>(null)
  const [togglingProvider, setTogglingProvider] = React.useState<string | null>(null)

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

  // Fetch providers
  const fetchProviders = React.useCallback(async () => {
    // Demo mode: use mock providers
    if (isDemoMode) {
      setProviders(demoProviders)
      setCanManage(true)
      setIsLoading(false)
      return
    }

    try {
      const accessToken = await getAccessToken()

      if (!accessToken) {
        // Don't set isLoading to false if we're still waiting for token
        // This prevents showing "no providers" before auth is ready
        if (!selectedOrganizationId) {
          setCanManage(true)
        }
        return
      }

      const response = await authFetch(`${API_URL}/api/providers`, accessToken, { cache: 'no-store' }, selectedOrganizationId)

      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers.map((p: Record<string, unknown>) => ({
          id: p.id,
          type: p.type,
          status: 'connected',
          displayName: p.name,
          identifiers: p.type === 'admob'
            ? { publisherId: p.identifier }
            : { networkCode: p.identifier, accountName: p.name },
          isEnabled: p.isEnabled !== false,
        })))
        setCanManage(data.canManage === true)
      } else {
        if (!selectedOrganizationId) {
          setCanManage(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
      if (!selectedOrganizationId) {
        setCanManage(true)
      }
    } finally {
      setIsLoading(false)
    }
  }, [getAccessToken, selectedOrganizationId, isDemoMode, demoProviders])

  // Wait for auth AND token to be ready before fetching
  // In demo mode, fetch immediately (no auth needed)
  React.useEffect(() => {
    if (isDemoMode) {
      fetchProviders()
    } else if (!isAuthLoading && isAuthenticated && hasToken) {
      fetchProviders()
    } else if (!isAuthLoading && !isAuthenticated) {
      setIsLoading(false)
    }
  }, [fetchProviders, isAuthLoading, isAuthenticated, hasToken, isDemoMode])

  // Handle OAuth callback messages
  React.useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      toast.success(`Successfully connected ${success === 'admob' ? 'AdMob' : 'Google Ad Manager'}!`)
      fetchProviders()
      window.history.replaceState({}, '', '/providers')
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'oauth_failed': 'OAuth connection failed. Please try again.',
        'no_code': 'No authorization code received.',
        'access_denied': 'Access was denied. Please grant permission to connect.',
      }
      toast.error(errorMessages[error] || `Connection error: ${error}`)
      window.history.replaceState({}, '', '/providers')
    }
  }, [searchParams, fetchProviders])

  const handleConnect = React.useCallback(async (type: "admob" | "gam") => {
    // Demo mode: show info toast instead of connecting
    if (isDemoMode) {
      toast.info('Provider connection is not available in demo mode. Using synthetic data.')
      return
    }

    setConnectingType(type)
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(`${API_URL}/api/providers/connect/${type}`, accessToken, {
        method: 'POST',
      }, selectedOrganizationId)

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth')
      }

      const { authUrl } = await response.json()
      window.location.href = authUrl
    } catch (error) {
      console.error('OAuth error:', error)
      toast.error('Failed to start connection. Please try again.')
      setConnectingType(null)
    }
  }, [getAccessToken, selectedOrganizationId, isDemoMode])

  const handleAccountSelected = React.useCallback((account: OAuthAccount) => {
    const newProvider: ProviderWithEnabled = {
      id: account.id,
      type: account.type,
      status: "connected",
      displayName: account.displayName,
      identifiers: account.identifiers,
      isEnabled: true,
    }
    setProviders((prev) => [...prev, newProvider])
    setAccountSelectionOpen(false)
    setPendingAccounts([])
  }, [])

  const handleAccountSelectionCancel = React.useCallback(() => {
    setAccountSelectionOpen(false)
    setPendingAccounts([])
  }, [])

  const handleDisconnect = React.useCallback(async (providerId: string) => {
    // Demo mode: show info toast
    if (isDemoMode) {
      toast.info('Provider management is not available in demo mode.')
      return
    }

    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(`${API_URL}/api/providers/${providerId}`, accessToken, {
        method: 'DELETE',
      }, selectedOrganizationId)

      if (response.ok) {
        setProviders(prev => prev.filter(p => p.id !== providerId))
        toast.success('Provider disconnected')
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect provider. Please try again.')
    }
  }, [getAccessToken, selectedOrganizationId, isDemoMode])

  const handleToggleEnabled = React.useCallback(async (providerId: string, enabled: boolean) => {
    setTogglingProvider(providerId)
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(`${API_URL}/api/providers/${providerId}/toggle`, accessToken, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: enabled }),
      }, selectedOrganizationId)

      if (response.ok) {
        setProviders(prev => prev.map(p =>
          p.id === providerId ? { ...p, isEnabled: enabled } : p
        ))
      } else {
        throw new Error('Failed to toggle')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Failed to update provider. Please try again.')
    } finally {
      setTogglingProvider(null)
    }
  }, [getAccessToken, selectedOrganizationId])

  return {
    // Data
    providers,
    canManage,
    pendingAccounts,
    // State
    isLoading,
    connectingType,
    accountSelectionOpen,
    togglingProvider,
    // Actions
    handleConnect,
    handleDisconnect,
    handleToggleEnabled,
    handleAccountSelected,
    handleAccountSelectionCancel,
    setAccountSelectionOpen,
  }
}
