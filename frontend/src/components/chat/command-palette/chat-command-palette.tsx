"use client"

import * as React from "react"
import {
  ChevronRight,
  Check,
  Search,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/molecules/collapsible"
import { Input } from "@/atoms/input"
import { cn } from "@/lib/utils"
import { useChatSettings } from "@/lib/chat-settings"
import { AdMobLogo, GoogleAdManagerLogo } from "@/components/icons/provider-logos"
import { AppleIcon, AndroidIcon } from "@/components/icons/platform-icons"
import type { Provider, ProviderApp } from "@/lib/types"

import type { SelectedContextItem } from "./use-command-palette"

interface CommandPaletteContentProps {
  providers: Provider[]
  providerApps: Record<string, ProviderApp[]>
  selectedContext: SelectedContextItem[]
  onToggleProvider: (providerId: string) => void
  onToggleApp: (providerId: string, appId: string) => void
  // Single-select mode: selecting an item calls this and closes (for keyboard "/" mode)
  singleSelectMode?: boolean
  onSingleSelect?: (item: { id: string; name: string; type: "provider" | "app"; subtype?: string }) => void
}

export function CommandPaletteContent({
  providers,
  providerApps,
  selectedContext: _selectedContext,
  onToggleProvider,
  onToggleApp,
  singleSelectMode = false,
  onSingleSelect,
}: CommandPaletteContentProps) {
  const {
    enabledProviderIds,
    enabledAppIds,
  } = useChatSettings()

  const [searchQuery, setSearchQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Focus input on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Track which providers are expanded
  const [expandedProviders, setExpandedProviders] = React.useState<Set<string>>(new Set())

  const toggleExpanded = (providerId: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(providerId)) {
        next.delete(providerId)
      } else {
        next.add(providerId)
      }
      return next
    })
  }

  // Check if explicitly selected (empty = nothing selected, no checkmarks)
  const isProviderSelected = (id: string) => {
    return enabledProviderIds.includes(id)
  }

  const isAppSelected = (providerId: string, appId: string) => {
    const providerAppIds = enabledAppIds[providerId]
    if (!providerAppIds) return false
    return providerAppIds.includes(appId)
  }

  const getProviderLogo = (type: string) => {
    if (type === "admob") return <AdMobLogo size="sm" />
    if (type === "gam") return <GoogleAdManagerLogo size="sm" />
    return null
  }

  const getPlatformIcon = (platform: string) => {
    if (platform === "ANDROID") return <AndroidIcon className="h-3.5 w-3.5 text-[#3DDC84]" />
    if (platform === "IOS") return <AppleIcon className="h-3.5 w-3.5 text-muted-foreground" />
    return null
  }

  // Filter providers and apps based on search
  const filteredProviders = React.useMemo(() => {
    if (!searchQuery.trim()) return providers

    const query = searchQuery.toLowerCase()
    return providers.filter((provider) => {
      const providerMatches = provider.displayName.toLowerCase().includes(query)
      const apps = providerApps[provider.id] || []
      const hasMatchingApp = apps.some((app) => app.name.toLowerCase().includes(query))
      return providerMatches || hasMatchingApp
    })
  }, [providers, providerApps, searchQuery])

  // Filter apps for a provider based on search
  const getFilteredApps = (providerId: string) => {
    const apps = providerApps[providerId] || []
    if (!searchQuery.trim()) return apps.slice(0, 8)

    const query = searchQuery.toLowerCase()
    return apps.filter((app) => app.name.toLowerCase().includes(query)).slice(0, 8)
  }

  // Auto-expand providers with matching apps when searching
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const providersWithMatches = new Set<string>()

      providers.forEach((provider) => {
        const apps = providerApps[provider.id] || []
        const hasMatchingApp = apps.some((app) => app.name.toLowerCase().includes(query))
        if (hasMatchingApp) {
          providersWithMatches.add(provider.id)
        }
      })

      setExpandedProviders(providersWithMatches)
    }
  }, [searchQuery, providers, providerApps])

  return (
    <div className="flex flex-col">
      {/* Search input */}
      <div className="p-2 border-b border-border/30">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search providers, apps, settings..."
            className="h-8 pl-8 text-sm bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-border/50"
          />
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto pb-2">
        {/* Providers Section - Tree Structure */}
        {filteredProviders.length > 0 && (
          <div className="p-1">
            <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Providers
            </div>
            <div className="space-y-0.5">
              {filteredProviders.map((provider) => {
                const filteredApps = getFilteredApps(provider.id)
                const allApps = providerApps[provider.id] || []
                const isExpanded = expandedProviders.has(provider.id)
                const hasApps = allApps.length > 0

                return (
                  <Collapsible
                    key={provider.id}
                    open={isExpanded}
                    onOpenChange={() => hasApps && toggleExpanded(provider.id)}
                  >
                    <div className="flex items-center">
                      {/* Expand/collapse trigger */}
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "flex items-center justify-center w-5 h-5 rounded hover:bg-muted/50",
                            !hasApps && "opacity-0 pointer-events-none"
                          )}
                        >
                          <ChevronRight
                            className={cn(
                              "h-3 w-3 text-muted-foreground transition-transform duration-200",
                              isExpanded && "rotate-90"
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>

                      {/* Provider row */}
                      <button
                        onClick={() => {
                          if (singleSelectMode && onSingleSelect) {
                            onSingleSelect({
                              id: provider.id,
                              name: provider.displayName,
                              type: "provider",
                              subtype: provider.type,
                            })
                          } else {
                            onToggleProvider(provider.id)
                          }
                        }}
                        className={cn(
                          "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left",
                          "hover:bg-muted/50 transition-colors",
                          !singleSelectMode && isProviderSelected(provider.id) && "bg-muted/30"
                        )}
                      >
                        {getProviderLogo(provider.type)}
                        <span className="flex-1 text-sm truncate">{provider.displayName}</span>
                        {!singleSelectMode && isProviderSelected(provider.id) && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                    </div>

                    {/* Apps (children) */}
                    <CollapsibleContent>
                      <div className="ml-5 pl-3 border-l border-border/30">
                        {filteredApps.map((app) => (
                          <button
                            key={app.id}
                            onClick={() => {
                              if (singleSelectMode && onSingleSelect) {
                                onSingleSelect({
                                  id: app.id,
                                  name: app.name,
                                  type: "app",
                                  subtype: app.platform,
                                })
                              } else {
                                onToggleApp(provider.id, app.id)
                              }
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left",
                              "hover:bg-muted/50 transition-colors",
                              !singleSelectMode && isAppSelected(provider.id, app.id) && "bg-muted/30"
                            )}
                          >
                            {getPlatformIcon(app.platform)}
                            <span className="flex-1 text-[13px] truncate">{app.name}</span>
                            {!singleSelectMode && isAppSelected(provider.id, app.id) && (
                              <Check className="h-3 w-3 text-primary" />
                            )}
                          </button>
                        ))}
                        {allApps.length > 8 && !searchQuery.trim() && (
                          <div className="px-2 py-1 text-[10px] text-muted-foreground/60">
                            +{allApps.length - 8} more
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </div>
        )}

        {/* No results */}
        {filteredProviders.length === 0 && searchQuery.trim() && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No results for &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  )
}

