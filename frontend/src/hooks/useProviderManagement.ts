"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import type { Provider, OAuthAccount } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export interface ProviderWithEnabled extends Provider {
  isEnabled: boolean
}

interface StatusMessage {
  type: 'success' | 'error'
  text: string
}

export function useProviderManagement() {
  const searchParams = useSearchParams()
  const { getAccessToken, selectedOrganizationId, isAuthenticated, isLoading: isAuthLoading } = useUser()

  const [providers, setProviders] = React.useState<ProviderWithEnabled[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [connectingType, setConnectingType] = React.useState<string | null>(null)
  const [statusMessage, setStatusMessage] = React.useState<StatusMessage | null>(null)
  const [accountSelectionOpen, setAccountSelectionOpen] = React.useState(false)
  const [pendingAccounts, setPendingAccounts] = React.useState<OAuthAccount[]>([])
  const [canManage, setCanManage] = React.useState<boolean | null>(null)
  const [togglingProvider, setTogglingProvider] = React.useState<string | null>(null)

  // Fetch providers
  const fetchProviders = React.useCallback(async () => {
    try {
      const accessToken = await getAccessToken()

      if (!accessToken) {
        if (!selectedOrganizationId) {
          setCanManage(true)
        }
        setIsLoading(false)
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
  }, [getAccessToken, selectedOrganizationId])

  // Wait for auth to be ready before fetching
  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      fetchProviders()
    } else if (!isAuthLoading && !isAuthenticated) {
      setIsLoading(false)
    }
  }, [fetchProviders, isAuthLoading, isAuthenticated])

  // Handle OAuth callback messages
  React.useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      setStatusMessage({
        type: 'success',
        text: `Successfully connected ${success === 'admob' ? 'AdMob' : 'Google Ad Manager'}!`
      })
      fetchProviders()
      window.history.replaceState({}, '', '/providers')
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'oauth_failed': 'OAuth connection failed. Please try again.',
        'no_code': 'No authorization code received.',
        'access_denied': 'Access was denied. Please grant permission to connect.',
      }
      setStatusMessage({
        type: 'error',
        text: errorMessages[error] || `Connection error: ${error}`
      })
      window.history.replaceState({}, '', '/providers')
    }

    if (success || error) {
      const timer = setTimeout(() => setStatusMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, fetchProviders])

  const handleConnect = React.useCallback(async (type: "admob" | "gam") => {
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
      setStatusMessage({
        type: 'error',
        text: 'Failed to start connection. Please try again.'
      })
      setConnectingType(null)
    }
  }, [getAccessToken, selectedOrganizationId])

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
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(`${API_URL}/api/providers/${providerId}`, accessToken, {
        method: 'DELETE',
      }, selectedOrganizationId)

      if (response.ok) {
        setProviders(prev => prev.filter(p => p.id !== providerId))
        setStatusMessage({
          type: 'success',
          text: 'Provider disconnected successfully.'
        })
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to disconnect provider. Please try again.'
      })
    }
  }, [getAccessToken, selectedOrganizationId])

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
      setStatusMessage({
        type: 'error',
        text: 'Failed to update provider. Please try again.'
      })
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
    statusMessage,
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
