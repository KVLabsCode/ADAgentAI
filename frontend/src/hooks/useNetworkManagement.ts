"use client"

import * as React from "react"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import type { NetworkCredential, NetworkConfig, NetworkName } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface StatusMessage {
  type: 'success' | 'error'
  text: string
}

interface NetworksState {
  networks: NetworkCredential[]
  configs: Record<NetworkName, NetworkConfig> | null
  canManage: boolean
  isLoading: boolean
  connectingNetwork: NetworkName | null
  statusMessage: StatusMessage | null
  togglingNetwork: string | null
}

export function useNetworkManagement() {
  const { getAccessToken, selectedOrganizationId, isAuthenticated, isLoading: isAuthLoading } = useUser()

  const [state, setState] = React.useState<NetworksState>({
    networks: [],
    configs: null,
    canManage: true,
    isLoading: true,
    connectingNetwork: null,
    statusMessage: null,
    togglingNetwork: null,
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

  // Fetch network configurations (field schemas)
  const fetchConfigs = React.useCallback(async () => {
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return

      const response = await authFetch(
        `${API_URL}/api/networks/config`,
        accessToken,
        { cache: 'no-store' },
        selectedOrganizationId
      )

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({ ...prev, configs: data.networks }))
      }
    } catch (error) {
      console.error('Failed to fetch network configs:', error)
    }
  }, [getAccessToken, selectedOrganizationId])

  // Fetch connected networks
  const fetchNetworks = React.useCallback(async () => {
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) {
        // Don't set isLoading to false if we're still waiting for token
        return
      }

      const response = await authFetch(
        `${API_URL}/api/networks`,
        accessToken,
        { cache: 'no-store' },
        selectedOrganizationId
      )

      if (response.ok) {
        const data = await response.json()
        setState(prev => ({
          ...prev,
          networks: data.networks,
          canManage: data.canManage === true,
          isLoading: false,
        }))
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error('Failed to fetch networks:', error)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [getAccessToken, selectedOrganizationId])

  // Initialize on auth AND token ready
  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated && hasToken) {
      fetchConfigs()
      fetchNetworks()
    } else if (!isAuthLoading && !isAuthenticated) {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [fetchConfigs, fetchNetworks, isAuthLoading, isAuthenticated, hasToken])

  // Connect a network with credentials
  const handleConnect = React.useCallback(async (
    networkName: NetworkName,
    credentials: Record<string, string>
  ) => {
    setState(prev => ({ ...prev, connectingNetwork: networkName }))

    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/networks/${networkName}`,
        accessToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials }),
        },
        selectedOrganizationId
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to connect network')
      }

      const result = await response.json()

      setState(prev => ({
        ...prev,
        networks: [
          ...prev.networks.filter(n => n.networkName !== networkName),
          {
            id: result.id,
            networkName,
            displayName: result.displayName,
            isEnabled: true,
            connectedAt: new Date().toISOString(),
            maskedCredentials: {},
          },
        ],
        connectingNetwork: null,
        statusMessage: {
          type: 'success',
          text: `${result.displayName} connected successfully!`,
        },
      }))

      // Clear status after 5s
      setTimeout(() => {
        setState(prev => ({ ...prev, statusMessage: null }))
      }, 5000)

      return true
    } catch (error) {
      console.error('Connect error:', error)
      setState(prev => ({
        ...prev,
        connectingNetwork: null,
        statusMessage: {
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to connect network',
        },
      }))
      return false
    }
  }, [getAccessToken, selectedOrganizationId])

  // Disconnect a network
  const handleDisconnect = React.useCallback(async (networkId: string) => {
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/networks/${networkId}`,
        accessToken,
        { method: 'DELETE' },
        selectedOrganizationId
      )

      if (response.ok) {
        setState(prev => ({
          ...prev,
          networks: prev.networks.filter(n => n.id !== networkId),
          statusMessage: {
            type: 'success',
            text: 'Network disconnected successfully.',
          },
        }))
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      setState(prev => ({
        ...prev,
        statusMessage: {
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to disconnect network',
        },
      }))
    }
  }, [getAccessToken, selectedOrganizationId])

  // Toggle network enabled/disabled
  const handleToggle = React.useCallback(async (networkId: string, enabled: boolean) => {
    setState(prev => ({ ...prev, togglingNetwork: networkId }))

    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/networks/${networkId}/toggle`,
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
          networks: prev.networks.map(n =>
            n.id === networkId ? { ...n, isEnabled: enabled } : n
          ),
          togglingNetwork: null,
        }))
      } else {
        throw new Error('Failed to toggle')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      setState(prev => ({
        ...prev,
        togglingNetwork: null,
        statusMessage: {
          type: 'error',
          text: 'Failed to update network. Please try again.',
        },
      }))
    }
  }, [getAccessToken, selectedOrganizationId])

  // Verify credentials before connecting
  const handleVerify = React.useCallback(async (
    networkName: NetworkName,
    credentials: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> => {
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/networks/${networkName}/verify`,
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

  // Check if a network is connected
  const isConnected = React.useCallback((networkName: NetworkName): boolean => {
    return state.networks.some(n => n.networkName === networkName)
  }, [state.networks])

  // Get connected network by name
  const getNetwork = React.useCallback((networkName: NetworkName): NetworkCredential | undefined => {
    return state.networks.find(n => n.networkName === networkName)
  }, [state.networks])

  return {
    // Data
    networks: state.networks,
    configs: state.configs,
    canManage: state.canManage,
    // State
    isLoading: state.isLoading,
    connectingNetwork: state.connectingNetwork,
    statusMessage: state.statusMessage,
    togglingNetwork: state.togglingNetwork,
    // Actions
    handleConnect,
    handleDisconnect,
    handleToggle,
    handleVerify,
    // Helpers
    isConnected,
    getNetwork,
    refetch: fetchNetworks,
  }
}
