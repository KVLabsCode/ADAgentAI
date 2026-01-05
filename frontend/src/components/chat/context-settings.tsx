"use client"

import * as React from "react"
import {
  Plug,
  ChevronDown,
  ChevronRight,
  Settings2,
  Loader2,
  Smartphone,
  Search,
  Building2,
  Layers,
  X,
  LayoutGrid,
  Network,
  FileText,
  Target,
  Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useChatSettings, type ResponseStyle } from "@/lib/chat-settings"
import type { Provider, ProviderApp } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface ContextSettingsProps {
  providers: Provider[]
}

export function ContextSettings({ providers }: ContextSettingsProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(["admob", "gam"])
  )
  // Track which providers have their children expanded
  const [expandedProviders, setExpandedProviders] = React.useState<Set<string>>(new Set())
  // Fetched apps per provider
  const [providerApps, setProviderApps] = React.useState<Record<string, ProviderApp[]>>({})
  // Loading state per provider
  const [loadingApps, setLoadingApps] = React.useState<Set<string>>(new Set())

  const {
    responseStyle,
    enabledProviderIds,
    enabledAppIds,
    autoIncludeContext,
    setResponseStyle,
    toggleProvider,
    toggleApp,
    setEnabledAppIds,
    setAutoIncludeContext,
    setEnabledProviderIds,
  } = useChatSettings()

  const admobProviders = providers.filter((p) => p.type === "admob")
  const gamProviders = providers.filter((p) => p.type === "gam")
  const hasProviders = providers.length > 0

  // Initialize enabled providers when providers load (if empty, enable all)
  React.useEffect(() => {
    if (providers.length > 0 && enabledProviderIds.length === 0) {
      setEnabledProviderIds(providers.map((p) => p.id))
    }
  }, [providers, enabledProviderIds.length, setEnabledProviderIds])

  // Check if a provider is enabled
  const isProviderEnabled = (id: string) => {
    if (enabledProviderIds.length === 0) return true
    return enabledProviderIds.includes(id)
  }

  // Check if an app is enabled
  const isAppEnabled = (providerId: string, appId: string) => {
    const providerAppIds = enabledAppIds[providerId]
    if (!providerAppIds || providerAppIds.length === 0) return true
    return providerAppIds.includes(appId)
  }

  // Get app selection state for a provider (all, some, none)
  const getProviderAppState = (providerId: string): "all" | "some" | "none" => {
    const apps = providerApps[providerId] || []
    if (apps.length === 0) return "all"

    const providerAppIds = enabledAppIds[providerId]
    if (!providerAppIds || providerAppIds.length === 0) return "all"

    const enabledCount = apps.filter((app) => providerAppIds.includes(app.id)).length
    if (enabledCount === 0) return "none"
    if (enabledCount === apps.length) return "all"
    return "some"
  }

  // Fetch apps for a provider
  const fetchApps = React.useCallback(
    async (providerId: string) => {
      if (providerApps[providerId] || loadingApps.has(providerId)) return

      setLoadingApps((prev) => new Set(prev).add(providerId))

      try {
        const response = await fetch(`${API_URL}/api/providers/${providerId}/apps`, {
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          setProviderApps((prev) => ({ ...prev, [providerId]: data.apps || [] }))

          // Initialize all apps as enabled if not set
          if (!enabledAppIds[providerId]) {
            const allAppIds = (data.apps || []).map((app: ProviderApp) => app.id)
            setEnabledAppIds(providerId, allAppIds)
          }
        }
      } catch (error) {
        console.error("Failed to fetch apps:", error)
      } finally {
        setLoadingApps((prev) => {
          const next = new Set(prev)
          next.delete(providerId)
          return next
        })
      }
    },
    [providerApps, loadingApps, enabledAppIds, setEnabledAppIds]
  )

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // Toggle provider expansion and fetch apps
  const toggleProviderExpanded = (providerId: string, providerType: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(providerId)) {
        next.delete(providerId)
      } else {
        next.add(providerId)
        // Fetch apps when expanding (only for AdMob currently)
        if (providerType === "admob") {
          fetchApps(providerId)
        }
      }
      return next
    })
  }

  // Toggle all apps for a provider
  const toggleAllApps = (providerId: string) => {
    const apps = providerApps[providerId] || []
    const currentState = getProviderAppState(providerId)

    if (currentState === "all") {
      setEnabledAppIds(providerId, [])
    } else {
      setEnabledAppIds(providerId, apps.map((app) => app.id))
    }
  }

  // Filter items by search
  const filterBySearch = <T extends { name?: string; displayName?: string }>(
    items: T[]
  ): T[] => {
    if (!searchQuery.trim()) return items
    const query = searchQuery.toLowerCase()
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.displayName?.toLowerCase().includes(query)
    )
  }

  // Count enabled items
  const enabledProviderCount =
    enabledProviderIds.length === 0
      ? providers.length
      : enabledProviderIds.filter((id) => providers.some((p) => p.id === id)).length

  const totalAppsCount = Object.values(providerApps).reduce((acc, apps) => acc + apps.length, 0)
  const enabledAppsCount = Object.entries(enabledAppIds).reduce((acc, [providerId, appIds]) => {
    const allApps = providerApps[providerId] || []
    if (!appIds || appIds.length === 0) return acc + allApps.length
    return acc + appIds.length
  }, 0)

  // Render provider item
  const renderProvider = (provider: Provider) => {
    const isExpanded = expandedProviders.has(provider.id)
    const isLoading = loadingApps.has(provider.id)
    const apps = filterBySearch(providerApps[provider.id] || [])
    const allApps = providerApps[provider.id] || []
    const appState = getProviderAppState(provider.id)
    const canExpand = provider.type === "admob" // Only AdMob has apps for now

    return (
      <div key={provider.id} className="border-b border-border/10 last:border-b-0">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 hover:bg-muted/40 transition-colors",
            isExpanded && "bg-muted/20"
          )}
        >
          {/* Expand button */}
          {canExpand && (
            <button
              onClick={() => toggleProviderExpanded(provider.id, provider.type)}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          )}
          {!canExpand && <div className="w-6" />}

          {/* Checkbox */}
          <Checkbox
            id={`provider-${provider.id}`}
            checked={isProviderEnabled(provider.id)}
            onCheckedChange={() => toggleProvider(provider.id)}
            className="h-4 w-4"
          />

          {/* Provider info */}
          <div className="flex-1 min-w-0">
            <label
              htmlFor={`provider-${provider.id}`}
              className="text-sm font-medium cursor-pointer block truncate"
            >
              {provider.displayName}
            </label>
            <p className="text-[11px] text-muted-foreground truncate">
              {provider.type === "admob"
                ? provider.identifiers.publisherId
                : `Network: ${provider.identifiers.networkCode}`}
            </p>
          </div>

          {/* Apps count badge */}
          {allApps.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {appState === "all"
                ? `${allApps.length} apps`
                : appState === "none"
                  ? "0 apps"
                  : `${enabledAppIds[provider.id]?.length || 0}/${allApps.length}`}
            </Badge>
          )}
        </div>

        {/* Expanded apps list */}
        {isExpanded && canExpand && (
          <div className="bg-muted/10 border-t border-border/10">
            {isLoading ? (
              <div className="flex items-center gap-2 px-6 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading apps...
              </div>
            ) : apps.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-3">
                {searchQuery ? "No matching apps" : "No apps found"}
              </p>
            ) : (
              <div className="py-1">
                {/* Select all row */}
                <div className="flex items-center gap-3 px-6 py-1.5 hover:bg-muted/30">
                  <Checkbox
                    id={`all-apps-${provider.id}`}
                    checked={appState === "all"}
                    onCheckedChange={() => toggleAllApps(provider.id)}
                    className="h-3.5 w-3.5"
                  />
                  <label
                    htmlFor={`all-apps-${provider.id}`}
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Select all apps
                  </label>
                </div>

                {/* Individual apps */}
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center gap-3 px-6 py-1.5 hover:bg-muted/30"
                  >
                    <Checkbox
                      id={`app-${app.id}`}
                      checked={isAppEnabled(provider.id, app.id)}
                      onCheckedChange={() => toggleApp(provider.id, app.id)}
                      className="h-3.5 w-3.5"
                    />
                    <Smartphone
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        app.platform === "ANDROID" ? "text-green-500" : "text-blue-500"
                      )}
                    />
                    <label
                      htmlFor={`app-${app.id}`}
                      className="text-xs cursor-pointer flex-1 truncate"
                    >
                      {app.name}
                    </label>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {app.platform === "ANDROID" ? "Android" : app.platform === "IOS" ? "iOS" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const filteredAdmobProviders = filterBySearch(admobProviders)
  const filteredGamProviders = filterBySearch(gamProviders)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-full transition-colors",
            hasProviders
              ? "text-muted-foreground/70 hover:text-foreground/80"
              : "text-muted-foreground/40 cursor-not-allowed"
          )}
          disabled={!hasProviders}
        >
          <Plug className="h-3.5 w-3.5" />
          <span className="sr-only">Context settings</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <DialogTitle className="text-base">Context Settings</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure which accounts, apps, and resources to include in queries
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border/30 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers, apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="divide-y divide-border/30">
            {/* AdMob Section */}
            {admobProviders.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection("admob")}
                  className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has("admob") ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Building2 className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">AdMob Accounts</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {admobProviders.filter((p) => isProviderEnabled(p.id)).length}/
                      {admobProviders.length}
                    </Badge>
                  </div>
                </button>

                {expandedSections.has("admob") && (
                  <div className="border-t border-border/20">
                    {filteredAdmobProviders.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-4 py-3">
                        No matching accounts
                      </p>
                    ) : (
                      filteredAdmobProviders.map(renderProvider)
                    )}
                  </div>
                )}
              </div>
            )}

            {/* GAM Section */}
            {gamProviders.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection("gam")}
                  className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has("gam") ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Layers className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Ad Manager Networks</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {gamProviders.filter((p) => isProviderEnabled(p.id)).length}/
                      {gamProviders.length}
                    </Badge>
                  </div>
                </button>

                {expandedSections.has("gam") && (
                  <div className="border-t border-border/20">
                    {filteredGamProviders.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-4 py-3">
                        No matching networks
                      </p>
                    ) : (
                      filteredGamProviders.map(renderProvider)
                    )}
                  </div>
                )}
              </div>
            )}

            {/* AdMob Placeholders */}
            {admobProviders.length > 0 && (
              <>
                {/* Ad Units placeholder */}
                <div>
                  <button
                    className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/40 transition-colors opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <LayoutGrid className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Ad Units</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Coming soon
                      </Badge>
                    </div>
                  </button>
                </div>

                {/* Mediation Groups placeholder */}
                <div>
                  <button
                    className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/40 transition-colors opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Layers className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Mediation Groups</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Coming soon
                      </Badge>
                    </div>
                  </button>
                </div>

                {/* Ad Sources/Networks placeholder */}
                <div>
                  <button
                    className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/40 transition-colors opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Network className="h-4 w-4 text-cyan-500" />
                      <span className="text-sm font-medium">Ad Sources</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Coming soon
                      </Badge>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* GAM Placeholders */}
            {gamProviders.length > 0 && (
              <>
                {/* GAM Ad Units placeholder */}
                <div>
                  <button
                    className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/40 transition-colors opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <LayoutGrid className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-medium">GAM Ad Units</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Coming soon
                      </Badge>
                    </div>
                  </button>
                </div>

                {/* Line Items placeholder */}
                <div>
                  <button
                    className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/40 transition-colors opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <FileText className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">Line Items</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Coming soon
                      </Badge>
                    </div>
                  </button>
                </div>

                {/* Orders placeholder */}
                <div>
                  <button
                    className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/40 transition-colors opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Target className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">Orders</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Coming soon
                      </Badge>
                    </div>
                  </button>
                </div>

                {/* Creatives placeholder */}
                <div>
                  <button
                    className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/40 transition-colors opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Palette className="h-4 w-4 text-pink-500" />
                      <span className="text-sm font-medium">Creatives</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Coming soon
                      </Badge>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Settings footer */}
        <div className="border-t border-border/30 p-4 space-y-3 shrink-0 bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-medium">Response Style</Label>
              <div className="flex gap-1">
                <Button
                  variant={responseStyle === "concise" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => setResponseStyle("concise")}
                >
                  Concise
                </Button>
                <Button
                  variant={responseStyle === "detailed" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => setResponseStyle("detailed")}
                >
                  Detailed
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <Label className="text-xs font-medium">Auto-context</Label>
                <p className="text-[10px] text-muted-foreground">Include account info</p>
              </div>
              <Switch
                checked={autoIncludeContext}
                onCheckedChange={setAutoIncludeContext}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/20">
            <span>
              {enabledProviderCount} of {providers.length} accounts active
            </span>
            {totalAppsCount > 0 && (
              <span>
                {enabledAppsCount} of {totalAppsCount} apps selected
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
