"use client"

import * as React from "react"
import { Plug, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import type { Provider, OAuthAccount } from "@/lib/types"

// Mock data - replace with real API calls
const mockProviders: Provider[] = [
  {
    id: "1",
    type: "admob",
    status: "connected",
    displayName: "My AdMob Account",
    identifiers: {
      publisherId: "pub-1234567890123456",
    },
  },
]

// Mock multiple accounts returned from GAM OAuth - for demo purposes
const mockGamAccounts: OAuthAccount[] = [
  {
    id: "gam-1",
    type: "gam",
    displayName: "Production Network",
    identifiers: {
      networkCode: "12345678",
      accountName: "My Company - Production",
    },
  },
  {
    id: "gam-2",
    type: "gam",
    displayName: "Staging Network",
    identifiers: {
      networkCode: "87654321",
      accountName: "My Company - Staging",
    },
  },
  {
    id: "gam-3",
    type: "gam",
    displayName: "Test Network",
    identifiers: {
      networkCode: "11223344",
      accountName: "My Company - Test",
    },
  },
]

export default function ProvidersPage() {
  const [providers, setProviders] = React.useState<Provider[]>(mockProviders)
  const [accountSelectionOpen, setAccountSelectionOpen] = React.useState(false)
  const [pendingAccounts, setPendingAccounts] = React.useState<OAuthAccount[]>([])
  const [pendingProviderType, setPendingProviderType] = React.useState<"admob" | "gam">("gam")

  const handleConnect = (type: "admob" | "gam") => {
    // TODO: Replace with real OAuth flow
    // For GAM, simulate OAuth returning multiple accounts
    if (type === "gam") {
      // Simulate OAuth callback with multiple accounts
      setPendingProviderType(type)
      setPendingAccounts(mockGamAccounts)
      setAccountSelectionOpen(true)
    } else {
      // AdMob typically returns single account
      console.log("Connecting AdMob - would initiate OAuth flow")
    }
  }

  const handleAccountSelected = (account: OAuthAccount) => {
    // Add the selected account as a connected provider
    const newProvider: Provider = {
      id: account.id,
      type: account.type,
      status: "connected",
      displayName: account.displayName,
      identifiers: account.identifiers,
    }
    setProviders((prev) => [...prev, newProvider])
    setAccountSelectionOpen(false)
    setPendingAccounts([])
  }

  const handleAccountSelectionCancel = () => {
    setAccountSelectionOpen(false)
    setPendingAccounts([])
  }

  const handleDisconnect = (providerId: string) => {
    setProviders(prev => prev.filter(p => p.id !== providerId))
  }

  return (
    <div className="flex flex-col gap-5 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-base font-medium tracking-tight">Connected Providers</h1>
          <p className="text-xs text-muted-foreground/70">
            Manage your ad platform connections.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-7 text-xs px-2.5">
              <Plus className="mr-1 h-3 w-3" />
              Connect
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleConnect("admob")} className="text-xs">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-green-600/90 flex items-center justify-center text-white text-[9px] font-semibold">
                  A
                </div>
                <span>AdMob</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConnect("gam")} className="text-xs">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-blue-600/90 flex items-center justify-center text-white text-[9px] font-semibold">
                  G
                </div>
                <span>Google Ad Manager</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {providers.length === 0 ? (
        <div className="rounded border border-border/30">
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="rounded bg-muted/50 p-2.5 mb-3">
              <Plug className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-medium mb-1">No providers connected</h3>
            <p className="text-[11px] text-muted-foreground/70 text-center max-w-xs mb-3">
              Connect your AdMob or Google Ad Manager account to start.
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-7 text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  Connect provider
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleConnect("admob")} className="text-xs">
                  AdMob
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConnect("gam")} className="text-xs">
                  Google Ad Manager
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/50 hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-base">Disconnect {provider.displayName}?</AlertDialogTitle>
                      <AlertDialogDescription className="text-xs">
                        This will remove access to this ad platform. You can reconnect at any time.
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
            ADAgent currently supports these ad platforms.
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
                <p className="text-[10px] text-muted-foreground/60">Available</p>
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
