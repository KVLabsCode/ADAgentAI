"use client"

import * as React from "react"
import { Plug, ChevronDown, ChevronRight, Settings2, Loader2, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useChatSettings, type ResponseStyle } from "@/lib/chat-settings"
import type { Provider, ProviderApp } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface ContextSettingsProps {
  providers: Provider[]
}

export function ContextSettings({ providers }: ContextSettingsProps) {
  const [open, setOpen] = React.useState(false)
  const [admobOpen, setAdmobOpen] = React.useState(true)
  const [gamOpen, setGamOpen] = React.useState(true)
  // Track which providers have their apps expanded
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
    // If no explicit selection, all are enabled
    if (enabledProviderIds.length === 0) return true
    return enabledProviderIds.includes(id)
  }

  // Check if an app is enabled
  const isAppEnabled = (providerId: string, appId: string) => {
    const providerAppIds = enabledAppIds[providerId]
    // If no explicit selection for this provider, all apps are enabled
    if (!providerAppIds || providerAppIds.length === 0) return true
    return providerAppIds.includes(appId)
  }

  // Get app selection state for a provider (all, some, none)
  const getProviderAppState = (providerId: string): "all" | "some" | "none" => {
    const apps = providerApps[providerId] || []
    if (apps.length === 0) return "all"

    const providerAppIds = enabledAppIds[providerId]
    if (!providerAppIds || providerAppIds.length === 0) return "all"

    const enabledCount = apps.filter(app => providerAppIds.includes(app.id)).length
    if (enabledCount === 0) return "none"
    if (enabledCount === apps.length) return "all"
    return "some"
  }

  // Fetch apps for a provider
  const fetchApps = React.useCallback(async (providerId: string) => {
    if (providerApps[providerId] || loadingApps.has(providerId)) return

    setLoadingApps(prev => new Set(prev).add(providerId))

    try {
      const response = await fetch(`${API_URL}/api/providers/${providerId}/apps`, {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setProviderApps(prev => ({ ...prev, [providerId]: data.apps || [] }))

        // Initialize all apps as enabled if not set
        if (!enabledAppIds[providerId]) {
          const allAppIds = (data.apps || []).map((app: ProviderApp) => app.id)
          setEnabledAppIds(providerId, allAppIds)
        }
      }
    } catch (error) {
      console.error("Failed to fetch apps:", error)
    } finally {
      setLoadingApps(prev => {
        const next = new Set(prev)
        next.delete(providerId)
        return next
      })
    }
  }, [providerApps, loadingApps, enabledAppIds, setEnabledAppIds])

  // Toggle provider expansion and fetch apps
  const toggleProviderExpanded = (providerId: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev)
      if (next.has(providerId)) {
        next.delete(providerId)
      } else {
        next.add(providerId)
        // Fetch apps when expanding
        fetchApps(providerId)
      }
      return next
    })
  }

  // Toggle all apps for a provider
  const toggleAllApps = (providerId: string) => {
    const apps = providerApps[providerId] || []
    const currentState = getProviderAppState(providerId)

    if (currentState === "all") {
      // Disable all apps
      setEnabledAppIds(providerId, [])
    } else {
      // Enable all apps
      setEnabledAppIds(providerId, apps.map(app => app.id))
    }
  }

  // Count enabled providers
  const enabledCount = enabledProviderIds.length === 0
    ? providers.length
    : enabledProviderIds.filter((id) => providers.some((p) => p.id === id)).length

  // Render a single provider with optional apps
  const renderProvider = (provider: Provider) => {
    const isExpanded = expandedProviders.has(provider.id)
    const isLoading = loadingApps.has(provider.id)
    const apps = providerApps[provider.id] || []
    const appState = getProviderAppState(provider.id)
    const hasApps = apps.length > 0 || isLoading

    return (
      <div key={provider.id} className="border-b border-border/20 last:border-b-0">
        <div className="flex items-center gap-2 py-1.5 pl-5 pr-3">
          {/* Expand/collapse button for apps */}
          {provider.type === "admob" && (
            <button
              onClick={() => toggleProviderExpanded(provider.id)}
              className="p-0.5 hover:bg-muted/50 rounded transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}

          {/* Provider info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Checkbox
                id={`provider-${provider.id}`}
                checked={isProviderEnabled(provider.id)}
                onCheckedChange={() => toggleProvider(provider.id)}
                className="h-3.5 w-3.5"
              />
              <label
                htmlFor={`provider-${provider.id}`}
                className="text-xs font-medium truncate cursor-pointer"
              >
                {provider.displayName}
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground truncate pl-5">
              {provider.type === "admob"
                ? provider.identifiers.publisherId
                : `Network: ${provider.identifiers.networkCode}`}
            </p>
          </div>

          {/* Apps count badge */}
          {apps.length > 0 && (
            <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
              {appState === "all"
                ? `${apps.length} apps`
                : appState === "none"
                  ? "0 apps"
                  : `${enabledAppIds[provider.id]?.length || 0}/${apps.length}`}
            </span>
          )}
        </div>

        {/* Apps list (collapsible) */}
        {isExpanded && provider.type === "admob" && (
          <div className="pb-2">
            {isLoading ? (
              <div className="flex items-center gap-2 pl-10 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading apps...
              </div>
            ) : apps.length === 0 ? (
              <p className="text-[10px] text-muted-foreground pl-10 py-1">
                No apps found
              </p>
            ) : (
              <div className="space-y-0.5 pl-8">
                {/* Select all apps */}
                <div className="flex items-center gap-2 py-1 px-2 hover:bg-muted/30 rounded">
                  <Checkbox
                    id={`all-apps-${provider.id}`}
                    checked={appState === "all"}
                    onCheckedChange={() => toggleAllApps(provider.id)}
                    className="h-3 w-3"
                    // Show indeterminate state when some apps are selected
                    data-state={appState === "some" ? "indeterminate" : undefined}
                  />
                  <label
                    htmlFor={`all-apps-${provider.id}`}
                    className="text-[10px] text-muted-foreground cursor-pointer"
                  >
                    Select all
                  </label>
                </div>

                {/* Individual apps */}
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center gap-2 py-1 px-2 hover:bg-muted/30 rounded"
                  >
                    <Checkbox
                      id={`app-${app.id}`}
                      checked={isAppEnabled(provider.id, app.id)}
                      onCheckedChange={() => toggleApp(provider.id, app.id)}
                      className="h-3 w-3"
                    />
                    <Smartphone className={cn(
                      "h-3 w-3",
                      app.platform === "ANDROID" ? "text-green-500" : "text-blue-500"
                    )} />
                    <label
                      htmlFor={`app-${app.id}`}
                      className="text-[10px] truncate cursor-pointer flex-1"
                    >
                      {app.name}
                    </label>
                    <span className="text-[9px] text-muted-foreground">
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Context Settings</h4>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Configure which accounts and apps to include
          </p>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {/* AdMob Accounts */}
          {admobProviders.length > 0 && (
            <Collapsible open={admobOpen} onOpenChange={setAdmobOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  {admobOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium">AdMob Accounts</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({admobProviders.filter((p) => isProviderEnabled(p.id)).length}/{admobProviders.length})
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pb-1">
                  {admobProviders.map(renderProvider)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* GAM Networks */}
          {gamProviders.length > 0 && (
            <Collapsible open={gamOpen} onOpenChange={setGamOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/50 transition-colors border-t border-border/30">
                <div className="flex items-center gap-2">
                  {gamOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium">Ad Manager Networks</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({gamProviders.filter((p) => isProviderEnabled(p.id)).length}/{gamProviders.length})
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pb-1">
                  {gamProviders.map(renderProvider)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Settings Section */}
          <div className="border-t border-border/30 p-3 space-y-3">
            <div className="space-y-2">
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

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium">Auto-include context</Label>
                <p className="text-[10px] text-muted-foreground">
                  Include selected accounts info automatically
                </p>
              </div>
              <Switch
                checked={autoIncludeContext}
                onCheckedChange={setAutoIncludeContext}
                className="scale-75"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border/30 bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            {enabledCount} of {providers.length} accounts active
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
