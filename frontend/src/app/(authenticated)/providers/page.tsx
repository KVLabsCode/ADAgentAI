"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Plug, Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PageContainer,
  PageHeader,
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
  EmptyState,
  StatusMessage,
} from "@/components/ui/theme"
import { AccountSelectionModal } from "@/components/providers/account-selection-modal"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Provider, OAuthAccount } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Extended provider type with enabled state
interface ProviderWithEnabled extends Provider {
  isEnabled: boolean
}

function ProvidersContent() {
  const searchParams = useSearchParams()
  const { getAccessToken, selectedOrganizationId, isAuthenticated, isLoading: isAuthLoading } = useUser()
  const [providers, setProviders] = React.useState<ProviderWithEnabled[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [connectingType, setConnectingType] = React.useState<string | null>(null)
  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [accountSelectionOpen, setAccountSelectionOpen] = React.useState(false)
  const [pendingAccounts, setPendingAccounts] = React.useState<OAuthAccount[]>([])
  const [pendingProviderType] = React.useState<"admob" | "gam">("gam")
  // Personal context should allow management by default
  // When in org context, this gets updated by API response
  const [canManage, setCanManage] = React.useState<boolean | null>(null) // null = not loaded yet
  const [togglingProvider, setTogglingProvider] = React.useState<string | null>(null)

  // Fetch providers on mount
  const fetchProviders = React.useCallback(async () => {
    try {
      const accessToken = await getAccessToken()
      console.log('[Providers] Fetching with orgId:', selectedOrganizationId, 'token:', accessToken ? 'present' : 'null')

      if (!accessToken) {
        console.warn('[Providers] No access token available - user may not be authenticated')
        // Default to canManage=true in personal context when auth fails
        if (!selectedOrganizationId) {
          setCanManage(true)
        }
        setIsLoading(false)
        return
      }

      const response = await authFetch(`${API_URL}/api/providers`, accessToken, { cache: 'no-store' }, selectedOrganizationId)

      if (response.ok) {
        const data = await response.json()
        console.log('[Providers] API response:', { canManage: data.canManage, providerCount: data.providers?.length })
        // Map API response to Provider type
        setProviders(data.providers.map((p: Record<string, unknown>) => ({
          id: p.id,
          type: p.type,
          status: 'connected',
          displayName: p.name,
          identifiers: p.type === 'admob'
            ? { publisherId: p.identifier }
            : { networkCode: p.identifier, accountName: p.name },
          isEnabled: p.isEnabled !== false, // Default to true
        })))
        // Set canManage from API response
        setCanManage(data.canManage === true)
      } else {
        console.error('[Providers] API error:', response.status, response.statusText)
        // On error, default to allowing management in personal context
        if (!selectedOrganizationId) {
          setCanManage(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
      // On error, default to allowing management in personal context
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
      // Not authenticated, stop loading
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
      // Refresh providers list
      fetchProviders()
      // Clear URL params
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

    // Auto-dismiss message after 5 seconds
    if (success || error) {
      const timer = setTimeout(() => setStatusMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, fetchProviders])

  const handleConnect = async (type: "admob" | "gam") => {
    setConnectingType(type)
    try {
      const accessToken = await getAccessToken()
      // Call API to get OAuth URL
      const response = await authFetch(`${API_URL}/api/providers/connect/${type}`, accessToken, {
        method: 'POST',
      }, selectedOrganizationId)

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth')
      }

      const { authUrl } = await response.json()

      // Redirect to Google OAuth
      window.location.href = authUrl
    } catch (error) {
      console.error('OAuth error:', error)
      setStatusMessage({
        type: 'error',
        text: 'Failed to start connection. Please try again.'
      })
      setConnectingType(null)
    }
  }

  const handleAccountSelected = (account: OAuthAccount) => {
    // Add the selected account as a connected provider
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
  }

  const handleAccountSelectionCancel = () => {
    setAccountSelectionOpen(false)
    setPendingAccounts([])
  }

  const handleDisconnect = async (providerId: string) => {
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
  }

  // Toggle provider enabled/disabled for user's queries
  const handleToggleEnabled = async (providerId: string, enabled: boolean) => {
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
  }

  return (
    <PageContainer>
      {/* Status Message */}
      {statusMessage && (
        <StatusMessage type={statusMessage.type} message={statusMessage.text} />
      )}

      <PageHeader
        title="Connected Providers"
        description="Manage your ad platform connections."
      >
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 text-xs">
                <Plus className="mr-1 h-3 w-3" />
                Connect
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleConnect("admob")}
                disabled={!!connectingType}
                className="text-xs"
              >
                <div className="flex items-center gap-2">
                  {connectingType === 'admob' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="h-5 w-5 rounded bg-emerald-600 flex items-center justify-center text-white text-[9px] font-semibold">
                      A
                    </div>
                  )}
                  <span>{connectingType === 'admob' ? 'Connecting...' : 'AdMob'}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleConnect("gam")}
                disabled={true}
                className="text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-muted flex items-center justify-center text-muted-foreground text-[9px] font-semibold">
                    G
                  </div>
                  <span className="flex-1 text-muted-foreground">Google Ad Manager</span>
                  <Badge variant="outline" className="text-[8px] h-3 px-1 border-border/40 text-muted-foreground/60 leading-none">
                    Soon
                  </Badge>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </PageHeader>

      {isLoading ? (
        <SectionCard>
          <div className="p-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-8 rounded bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-muted rounded" />
                  <div className="h-2.5 w-24 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : providers.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Plug}
            title="No providers connected"
            description={canManage === false
              ? "No ad platforms have been connected yet. Contact your organization admin to connect providers."
              : "Connect your AdMob or Google Ad Manager account to start."}
            className="py-12"
          >
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-8 text-xs">
                    <Plus className="mr-1 h-3 w-3" />
                    Connect provider
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleConnect("admob")} className="text-xs" disabled={!!connectingType}>
                    {connectingType === 'admob' ? 'Connecting...' : 'AdMob'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleConnect("gam")} className="text-xs" disabled={true}>
                    <div className="flex items-center justify-between w-full">
                      <span>Google Ad Manager</span>
                      <Badge variant="outline" className="text-[8px] h-3 px-1 border-border/40 text-muted-foreground/60 leading-none ml-2">
                        Soon
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </EmptyState>
        </SectionCard>
      ) : (
        <SectionCard>
          <SectionCardContent padded={false}>
            <div className="divide-y divide-border/30">
              {providers.map((provider) => (
                <div key={provider.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded flex items-center justify-center text-white text-xs font-semibold",
                          provider.type === "admob"
                            ? "bg-emerald-600"
                            : "bg-muted"
                        )}
                      >
                        {provider.type === "admob" ? "A" : "G"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {provider.displayName}
                          </span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                            {provider.type === "admob" ? "AdMob" : "GAM"}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-muted-foreground">Connected</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {provider.type === "admob"
                            ? provider.identifiers.publisherId
                            : `${provider.identifiers.networkCode} • ${provider.identifiers.accountName}`
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Enable/Disable toggle - available to all users */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {provider.isEnabled ? "Enabled" : "Disabled"}
                        </span>
                        <Switch
                          checked={provider.isEnabled}
                          onCheckedChange={(checked) => handleToggleEnabled(provider.id, checked)}
                          disabled={togglingProvider === provider.id}
                          className="scale-75"
                        />
                      </div>

                      {/* Disconnect button - only for admins */}
                      {canManage && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-base">Disconnect {provider.displayName}?</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs">
                                This will remove access to this ad platform for the entire organization. You can reconnect at any time.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDisconnect(provider.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCardContent>
        </SectionCard>
      )}

      {/* Supported Platforms Info */}
      <SectionCard>
        <SectionCardHeader
          icon={Plug}
          title="Supported Platforms"
          description="ADAgentAI currently supports these ad platforms."
        />
        <SectionCardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-3 rounded border border-border/30">
              <div className="h-8 w-8 rounded bg-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
                A
              </div>
              <div>
                <p className="text-xs font-medium">AdMob</p>
                <p className="text-[10px] text-muted-foreground">Available</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded border border-border/30">
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs font-semibold">
                G
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Google Ad Manager</p>
                <p className="text-[10px] text-muted-foreground">Coming soon</p>
              </div>
            </div>
          </div>
        </SectionCardContent>
      </SectionCard>

      {/* Account Selection Modal - shown when OAuth returns multiple accounts */}
      <AccountSelectionModal
        open={accountSelectionOpen}
        onOpenChange={setAccountSelectionOpen}
        accounts={pendingAccounts}
        providerType={pendingProviderType}
        onConfirm={handleAccountSelected}
        onCancel={handleAccountSelectionCancel}
      />
    </PageContainer>
  )
}

function ProvidersLoadingSkeleton() {
  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
          <div className="h-3 w-56 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      </div>
      <SectionCard>
        <div className="p-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 rounded bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 bg-muted rounded" />
                <div className="h-2.5 w-24 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  )
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={<ProvidersLoadingSkeleton />}>
      <ProvidersContent />
    </Suspense>
  )
}
