"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Plug, Plus, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react"
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
  const { getAccessToken } = useUser()
  const [providers, setProviders] = React.useState<ProviderWithEnabled[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [connectingType, setConnectingType] = React.useState<string | null>(null)
  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [accountSelectionOpen, setAccountSelectionOpen] = React.useState(false)
  const [pendingAccounts, setPendingAccounts] = React.useState<OAuthAccount[]>([])
  const [pendingProviderType] = React.useState<"admob" | "gam">("gam")
  const [canManage, setCanManage] = React.useState(false) // Can user connect/disconnect?
  const [togglingProvider, setTogglingProvider] = React.useState<string | null>(null)

  // Fetch providers on mount
  const fetchProviders = React.useCallback(async () => {
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(`${API_URL}/api/providers`, accessToken)

      if (response.ok) {
        const data = await response.json()
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
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getAccessToken])

  React.useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

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
      })

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
      })

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
      })

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
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
      {/* Status Message */}
      {statusMessage && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-xs",
          statusMessage.type === 'success'
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        )}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          {statusMessage.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-base font-medium tracking-tight">Connected Providers</h1>
          <p className="text-xs text-muted-foreground/70">
            Manage your ad platform connections.
          </p>
        </div>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-7 text-xs px-2.5">
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
                    <div className="h-5 w-5 rounded bg-green-600/90 flex items-center justify-center text-white text-[9px] font-semibold">
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
                  <div className="h-5 w-5 rounded bg-blue-600/90 flex items-center justify-center text-white text-[9px] font-semibold">
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
      </div>

      {isLoading ? (
        <div className="grid gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded border border-border/30 px-3 py-2.5 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-muted rounded" />
                  <div className="h-2.5 w-24 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded border border-border/30">
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="rounded bg-muted/50 p-2.5 mb-3">
              <Plug className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-medium mb-1">No providers connected</h3>
            <p className="text-[11px] text-muted-foreground/70 text-center max-w-xs mb-3">
              {canManage
                ? "Connect your AdMob or Google Ad Manager account to start."
                : "No ad platforms have been connected yet. Contact your organization admin to connect providers."}
            </p>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-7 text-xs">
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
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded border border-border/30 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "h-6 w-6 rounded flex items-center justify-center text-white text-[10px] font-semibold",
                      provider.type === "admob"
                        ? "bg-green-600/90"
                        : "bg-blue-600/90"
                    )}
                  >
                    {provider.type === "admob" ? "A" : "G"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">
                        {provider.displayName}
                      </span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1 border-border/40">
                        {provider.type === "admob" ? "AdMob" : "GAM"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500/80" />
                        <span className="text-[10px] text-muted-foreground/60">Connected</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">
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
                    <span className="text-[10px] text-muted-foreground/60">
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
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/50 hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
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
      )}

      {/* Supported Platforms Info */}
      <div className="rounded border border-border/30 bg-muted/20">
        <div className="px-3 py-2 border-b border-border/30">
          <h2 className="text-xs font-medium">Supported Platforms</h2>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            ADAgentAI currently supports these ad platforms.
          </p>
        </div>
        <div className="p-2">
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-background/50">
              <div className="h-5 w-5 rounded bg-green-600/90 flex items-center justify-center text-white text-[9px] font-semibold">
                A
              </div>
              <div>
                <p className="text-xs font-medium">AdMob</p>
                <p className="text-[10px] text-muted-foreground/60">Available</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-background/50">
              <div className="h-5 w-5 rounded bg-blue-600/90 flex items-center justify-center text-white text-[9px] font-semibold">
                G
              </div>
              <div>
                <p className="text-xs font-medium">Google Ad Manager</p>
                <p className="text-[10px] text-muted-foreground/60">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Selection Modal - shown when OAuth returns multiple accounts */}
      <AccountSelectionModal
        open={accountSelectionOpen}
        onOpenChange={setAccountSelectionOpen}
        accounts={pendingAccounts}
        providerType={pendingProviderType}
        onConfirm={handleAccountSelected}
        onCancel={handleAccountSelectionCancel}
      />
    </div>
  )
}

function ProvidersLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
          <div className="h-3 w-56 bg-muted rounded animate-pulse mt-1" />
        </div>
        <div className="h-7 w-20 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid gap-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded border border-border/30 px-3 py-2.5 animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 bg-muted rounded" />
                <div className="h-2.5 w-24 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={<ProvidersLoadingSkeleton />}>
      <ProvidersContent />
    </Suspense>
  )
}
