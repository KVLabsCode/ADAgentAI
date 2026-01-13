"use client"

import * as React from "react"
import {
  Plug,
  ChevronRight,
  Settings2,
  Loader2,
  Search,
  Layers,
  X,
  LayoutGrid,
  Network,
  FileText,
  Target,
  Palette,
  Check,
  Minus,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AdMobLogo, GoogleAdManagerLogo } from "@/components/icons/provider-logos"
import { useChatSettings } from "@/lib/chat-settings"
import { useSidebar } from "@/components/ui/sidebar"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import type { Provider, ProviderApp } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface ContextSettingsProps {
  providers: Provider[]
}

// Custom checkbox with indeterminate state
function TreeCheckbox({
  checked,
  indeterminate,
  onCheckedChange,
  className,
}: {
  checked: boolean
  indeterminate?: boolean
  onCheckedChange: () => void
  className?: string
}) {
  return (
    <button
      onClick={onCheckedChange}
      className={cn(
        "h-4 w-4 shrink-0 rounded border transition-all duration-150",
        "flex items-center justify-center",
        checked || indeterminate
          ? "bg-primary border-primary text-primary-foreground"
          : "border-muted-foreground/30 hover:border-muted-foreground/50 bg-background",
        className
      )}
    >
      {indeterminate ? (
        <Minus className="h-3 w-3" strokeWidth={3} />
      ) : checked ? (
        <Check className="h-3 w-3" strokeWidth={3} />
      ) : null}
    </button>
  )
}

// Tree connector line component
function TreeLine({ isLast, hasChildren: _hasChildren, isExpanded: _isExpanded }: { isLast: boolean; hasChildren?: boolean; isExpanded?: boolean }) {
  return (
    <div className="relative w-5 h-full flex items-center justify-center">
      {/* Vertical line */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-px bg-border/50",
          isLast ? "top-0 h-1/2" : "top-0 bottom-0"
        )}
      />
      {/* Horizontal line */}
      <div className="absolute left-1/2 w-1/2 h-px bg-border/50" />
    </div>
  )
}

export function ContextSettings({ providers }: ContextSettingsProps) {
  const { getAccessToken } = useUser()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(["admob", "gam"]))
  const [expandedProviders, setExpandedProviders] = React.useState<Set<string>>(new Set())
  const [providerApps, setProviderApps] = React.useState<Record<string, ProviderApp[]>>({})
  const [loadingApps, setLoadingApps] = React.useState<Set<string>>(new Set())

  const { state: sidebarState, isMobile } = useSidebar()

  // Calculate dialog offset based on sidebar state
  // Sidebar expanded = 16rem (8rem offset), collapsed = 3rem (1.5rem offset), mobile = 0
  const dialogOffset = isMobile ? "50%" : sidebarState === "expanded" ? "calc(50% + 8rem)" : "calc(50% + 1.5rem)"

  const {
    responseStyle,
    contextMode,
    displayMode,
    safeMode,
    enabledProviderIds,
    enabledAppIds,
    autoIncludeContext,
    setResponseStyle,
    setContextMode,
    setDisplayMode,
    setSafeMode,
    toggleProvider,
    toggleApp,
    setEnabledAppIds,
    setAutoIncludeContext,
    setEnabledProviderIds,
  } = useChatSettings()

  const admobProviders = providers.filter((p) => p.type === "admob")
  const gamProviders = providers.filter((p) => p.type === "gam")
  const hasProviders = providers.length > 0

  // Initialize enabled providers
  React.useEffect(() => {
    if (providers.length > 0 && enabledProviderIds.length === 0) {
      setEnabledProviderIds(providers.map((p) => p.id))
    }
  }, [providers, enabledProviderIds.length, setEnabledProviderIds])

  // Auto-expand providers when searching and they have matching apps
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const providersWithMatchingApps = Object.entries(providerApps)
        .filter(([, apps]) => apps.some(app => app.name.toLowerCase().includes(query)))
        .map(([providerId]) => providerId)

      if (providersWithMatchingApps.length > 0) {
        setExpandedProviders(prev => {
          const next = new Set(prev)
          providersWithMatchingApps.forEach(id => next.add(id))
          return next
        })
      }
    }
  }, [searchQuery, providerApps])

  const isProviderEnabled = (id: string) => {
    if (enabledProviderIds.length === 0) return true
    return enabledProviderIds.includes(id)
  }

  const isAppEnabled = (providerId: string, appId: string) => {
    const providerAppIds = enabledAppIds[providerId]
    if (!providerAppIds || providerAppIds.length === 0) return true
    return providerAppIds.includes(appId)
  }

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

  const fetchApps = React.useCallback(
    async (providerId: string) => {
      if (providerApps[providerId] || loadingApps.has(providerId)) return
      setLoadingApps((prev) => new Set(prev).add(providerId))
      try {
        const accessToken = await getAccessToken()
        const response = await authFetch(`${API_URL}/api/providers/${providerId}/apps`, accessToken)
        if (response.ok) {
          const data = await response.json()
          setProviderApps((prev) => ({ ...prev, [providerId]: data.apps || [] }))
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
    [providerApps, loadingApps, enabledAppIds, setEnabledAppIds, getAccessToken]
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const toggleProviderExpanded = (providerId: string, providerType: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(providerId)) {
        next.delete(providerId)
      } else {
        next.add(providerId)
        if (providerType === "admob") fetchApps(providerId)
      }
      return next
    })
  }

  const toggleAllApps = (providerId: string) => {
    const apps = providerApps[providerId] || []
    const currentState = getProviderAppState(providerId)
    if (currentState === "all") {
      setEnabledAppIds(providerId, [])
    } else {
      setEnabledAppIds(providerId, apps.map((app) => app.id))
    }
  }

  // Check if item matches search (for highlighting)
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return false
    return text.toLowerCase().includes(searchQuery.toLowerCase())
  }

  // Filter providers - show if provider matches OR has matching apps
  const filterProviders = (providerList: Provider[]) => {
    if (!searchQuery.trim()) return providerList
    const query = searchQuery.toLowerCase()
    return providerList.filter((provider) => {
      const providerMatches =
        provider.displayName.toLowerCase().includes(query) ||
        provider.identifiers.publisherId?.toLowerCase().includes(query) ||
        provider.identifiers.networkCode?.toLowerCase().includes(query)
      const apps = providerApps[provider.id] || []
      const hasMatchingApps = apps.some(app => app.name.toLowerCase().includes(query))
      return providerMatches || hasMatchingApps
    })
  }

  // Filter apps
  const filterApps = (apps: ProviderApp[]) => {
    if (!searchQuery.trim()) return apps
    const query = searchQuery.toLowerCase()
    return apps.filter(app => app.name.toLowerCase().includes(query))
  }

  const enabledProviderCount = enabledProviderIds.length === 0
    ? providers.length
    : enabledProviderIds.filter((id) => providers.some((p) => p.id === id)).length

  const filteredAdmobProviders = filterProviders(admobProviders)
  const filteredGamProviders = filterProviders(gamProviders)

  // Render a provider row
  const renderProvider = (provider: Provider, index: number, total: number) => {
    const isExpanded = expandedProviders.has(provider.id)
    const isLoading = loadingApps.has(provider.id)
    const allApps = providerApps[provider.id] || []
    const filteredAppsList = filterApps(allApps)
    const appState = getProviderAppState(provider.id)
    const canExpand = provider.type === "admob"
    const isLast = index === total - 1
    const highlighted = matchesSearch(provider.displayName)
    const isEnabled = isProviderEnabled(provider.id)

    return (
      <div key={provider.id} className="relative">
        {/* Provider Row */}
        <div
          className={cn(
            "flex items-center gap-1.5 py-1.5 pr-3 transition-colors group",
            "hover:bg-muted/40",
            isExpanded && "bg-muted/20",
            !isEnabled && "opacity-50"
          )}
          style={{ paddingLeft: "1.5rem" }}
        >
          {/* Tree connector */}
          <div className="absolute left-2 top-0 bottom-0 flex">
            <TreeLine isLast={isLast && !isExpanded} />
          </div>

          {/* Expand/collapse */}
          {canExpand ? (
            <button
              onClick={() => toggleProviderExpanded(provider.id, provider.type)}
              className={cn(
                "p-0.5 rounded transition-all duration-200 shrink-0",
                "hover:bg-muted-foreground/10",
                isExpanded && "bg-muted-foreground/5"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : (
                <ChevronRight
                  className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )}
                />
              )}
            </button>
          ) : (
            <div className="w-4 shrink-0" />
          )}

          {/* Checkbox */}
          <TreeCheckbox
            checked={isProviderEnabled(provider.id)}
            indeterminate={appState === "some"}
            onCheckedChange={() => toggleProvider(provider.id)}
            className="shrink-0 h-3.5 w-3.5"
          />

          {/* Provider info */}
          <div className="flex-1 min-w-0 ml-1 overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-xs font-medium truncate block max-w-full",
                  highlighted && "bg-yellow-500/20 text-yellow-200 px-1 -mx-1 rounded",
                  !isEnabled && "text-muted-foreground"
                )}
              >
                {provider.displayName}
              </span>
              {!isEnabled && (
                <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                  Disabled
                </span>
              )}
            </div>
            <p className="text-[9px] text-muted-foreground/70 truncate font-mono">
              {provider.type === "admob"
                ? provider.identifiers.publisherId
                : `Network: ${provider.identifiers.networkCode}`}
            </p>
          </div>

          {/* App count pill */}
          {allApps.length > 0 && (
            <div
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[9px] font-medium transition-colors shrink-0",
                appState === "all"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : appState === "none"
                    ? "bg-muted text-muted-foreground"
                    : "bg-amber-500/10 text-amber-400"
              )}
            >
              {appState === "all"
                ? `${allApps.length}`
                : `${enabledAppIds[provider.id]?.length || 0}/${allApps.length}`}
            </div>
          )}
        </div>

        {/* Apps (expanded) */}
        {isExpanded && canExpand && (
          <div
            className={cn(
              "relative overflow-hidden transition-all duration-200",
              "border-l border-border/30"
            )}
            style={{ marginLeft: "1.25rem" }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2 py-2 pl-3 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading apps...</span>
              </div>
            ) : filteredAppsList.length === 0 ? (
              <div className="py-2 pl-3 text-[10px] text-muted-foreground/60">
                {searchQuery ? "No matching apps" : "No apps found"}
              </div>
            ) : (
              <div className="py-0.5">
                {/* Select all */}
                <div className={cn(
                  "flex items-center gap-2 py-1 pl-3 pr-3 hover:bg-muted/30 transition-colors",
                  !isEnabled && "opacity-50 pointer-events-none"
                )}>
                  <TreeCheckbox
                    checked={appState === "all"}
                    indeterminate={appState === "some"}
                    onCheckedChange={() => toggleAllApps(provider.id)}
                    className="h-3 w-3 shrink-0"
                  />
                  <span className="text-[10px] text-muted-foreground">Select all</span>
                </div>

                {/* App list */}
                {filteredAppsList.map((app, appIndex) => {
                  const appHighlighted = matchesSearch(app.name)
                  const isLastApp = appIndex === filteredAppsList.length - 1
                  // App is only enabled if both parent provider and app itself are enabled
                  const appEnabled = isEnabled && isAppEnabled(provider.id, app.id)

                  return (
                    <div
                      key={app.id}
                      className={cn(
                        "flex items-center gap-1.5 py-1 pl-3 pr-3 transition-colors",
                        "hover:bg-muted/30 group/app",
                        !appEnabled && "opacity-50",
                        !isEnabled && "pointer-events-none"
                      )}
                    >
                      {/* App tree connector */}
                      <div className="relative -ml-1.5 w-3 h-full flex items-center shrink-0">
                        <div
                          className={cn(
                            "absolute left-0 w-px bg-border/40",
                            isLastApp ? "top-0 h-1/2" : "top-0 bottom-0 -translate-y-full h-[200%]"
                          )}
                        />
                        <div className="absolute left-0 w-1.5 h-px bg-border/40" />
                      </div>

                      <TreeCheckbox
                        checked={isAppEnabled(provider.id, app.id)}
                        onCheckedChange={() => toggleApp(provider.id, app.id)}
                        className="h-3 w-3 shrink-0"
                      />

                      {/* Platform icon */}
                      <div
                        className={cn(
                          "h-4 w-4 rounded flex items-center justify-center shrink-0",
                          app.platform === "ANDROID" ? "bg-emerald-500/20" : "bg-blue-500/20"
                        )}
                        title={app.platform === "ANDROID" ? "Android" : "iOS"}
                      >
                        {app.platform === "ANDROID" ? (
                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-500" fill="currentColor">
                            <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0012 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31A5.983 5.983 0 006 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-blue-500" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                          </svg>
                        )}
                      </div>

                      <span
                        className={cn(
                          "text-xs flex-1 truncate min-w-0",
                          appHighlighted && "bg-yellow-500/20 text-yellow-200 px-1 -mx-1 rounded",
                          !appEnabled && "text-muted-foreground"
                        )}
                      >
                        {app.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Render section (AdMob, GAM, etc.)
  const renderSection = (
    id: string,
    title: string,
    icon: React.ReactNode,
    iconColor: string,
    providerList: Provider[],
    filteredList: Provider[]
  ) => {
    const isExpanded = expandedSections.has(id)
    const enabledCount = providerList.filter((p) => isProviderEnabled(p.id)).length

    return (
      <div className="border-b border-border/20 last:border-b-0">
        {/* Section header */}
        <button
          onClick={() => toggleSection(id)}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 transition-colors",
            "hover:bg-muted/30",
            isExpanded && "bg-muted/10"
          )}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
              isExpanded && "rotate-90"
            )}
          />
          <div className={cn("p-1 rounded shrink-0", iconColor)}>
            {icon}
          </div>
          <span className="text-xs font-medium flex-1 text-left truncate">{title}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground">
              {enabledCount}/{providerList.length}
            </span>
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                enabledCount === providerList.length
                  ? "bg-emerald-500"
                  : enabledCount > 0
                    ? "bg-amber-500"
                    : "bg-muted-foreground/30"
              )}
            />
          </div>
        </button>

        {/* Section content */}
        {isExpanded && (
          <div className="pb-1">
            {filteredList.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 px-3 py-2">
                {searchQuery ? "No matching accounts" : "No accounts"}
              </p>
            ) : (
              filteredList.map((provider, idx) =>
                renderProvider(provider, idx, filteredList.length)
              )
            )}
          </div>
        )}
      </div>
    )
  }

  // Placeholder section
  const renderPlaceholder = (title: string, icon: React.ReactNode, iconColor: string) => (
    <div className="border-b border-border/20 last:border-b-0">
      <div className="flex items-center gap-2 w-full px-3 py-1.5 opacity-40">
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className={cn("p-1 rounded shrink-0", iconColor)}>
          {icon}
        </div>
        <span className="text-xs font-medium flex-1 text-left truncate">{title}</span>
        <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full shrink-0">
          Soon
        </span>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-full transition-all duration-200",
            hasProviders
              ? "text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
              : "text-muted-foreground/30 cursor-not-allowed"
          )}
          disabled={!hasProviders}
        >
          <Plug className="h-3.5 w-3.5" />
          <span className="sr-only">Context settings</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className="w-[calc(100%-1rem)] sm:max-w-[420px] lg:max-w-[520px] xl:max-w-[600px] p-0 gap-0 max-h-[65vh] lg:max-h-[75vh] flex flex-col border-border/30 !bg-background"
        style={{ left: isMobile ? "50%" : dialogOffset, overflow: "hidden" }}
      >
        {/* Header */}
        <DialogHeader className="px-3 lg:px-4 py-2 lg:py-3 border-b border-border/30 shrink-0 bg-card">
          <div className="flex items-center gap-2">
            <div className="p-1 lg:p-1.5 rounded border border-border/50 shrink-0">
              <Settings2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xs lg:text-sm font-medium">Context Settings</DialogTitle>
              <p className="text-[9px] lg:text-[10px] text-muted-foreground">
                Select accounts and apps for your queries
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-3 lg:px-4 py-1.5 lg:py-2 border-b border-border/20 shrink-0 bg-background">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 lg:h-3.5 lg:w-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Search accounts, apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-7 lg:pl-8 h-7 lg:h-8 text-[11px] lg:text-xs border-border/30 bg-card",
                "focus:border-border/50 transition-colors"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded transition-colors"
              >
                <X className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 bg-background">
          <ScrollArea type="hover" style={{ maxHeight: "calc(65vh - 180px)" }}>
            <div className="py-2">
            {/* AdMob Section */}
            {admobProviders.length > 0 &&
              renderSection(
                "admob",
                "AdMob Accounts",
                <AdMobLogo size="sm" />,
                "",
                admobProviders,
                filteredAdmobProviders
              )}

            {/* GAM Section */}
            {gamProviders.length > 0 &&
              renderSection(
                "gam",
                "Ad Manager Networks",
                <GoogleAdManagerLogo size="sm" />,
                "",
                gamProviders,
                filteredGamProviders
              )}

            {/* Placeholders */}
            {admobProviders.length > 0 && (
              <>
                {renderPlaceholder(
                  "Ad Units",
                  <LayoutGrid className="h-4 w-4 text-emerald-400" />,
                  "bg-emerald-500/10"
                )}
                {renderPlaceholder(
                  "Mediation Groups",
                  <Layers className="h-4 w-4 text-purple-400" />,
                  "bg-purple-500/10"
                )}
                {renderPlaceholder(
                  "Ad Sources",
                  <Network className="h-4 w-4 text-cyan-400" />,
                  "bg-cyan-500/10"
                )}
              </>
            )}

            {gamProviders.length > 0 && (
              <>
                {renderPlaceholder(
                  "GAM Ad Units",
                  <LayoutGrid className="h-4 w-4 text-indigo-400" />,
                  "bg-indigo-500/10"
                )}
                {renderPlaceholder(
                  "Line Items",
                  <FileText className="h-4 w-4 text-amber-400" />,
                  "bg-amber-500/10"
                )}
                {renderPlaceholder(
                  "Orders",
                  <Target className="h-4 w-4 text-red-400" />,
                  "bg-red-500/10"
                )}
                {renderPlaceholder(
                  "Creatives",
                  <Palette className="h-4 w-4 text-pink-400" />,
                  "bg-pink-500/10"
                )}
              </>
            )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer - solid background with z-index to stay above scroll content */}
        <div className="border-t border-border/30 px-3 lg:px-4 py-2 lg:py-3 shrink-0 relative z-10 bg-card">
          {/* Controls row */}
          <div className="flex items-center justify-between gap-2 lg:gap-3">
            {/* Response Style */}
            <div className="flex items-center gap-1.5 lg:gap-2">
              <span className="text-[9px] lg:text-[10px] text-muted-foreground shrink-0">Response:</span>
              <div className="flex gap-0.5 p-0.5 rounded border border-border/50 bg-muted">
                <button
                  onClick={() => setResponseStyle("concise")}
                  className={cn(
                    "px-1.5 lg:px-2 py-0.5 text-[9px] lg:text-[10px] font-medium rounded transition-all",
                    responseStyle === "concise"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Concise
                </button>
                <button
                  onClick={() => setResponseStyle("detailed")}
                  className={cn(
                    "px-1.5 lg:px-2 py-0.5 text-[9px] lg:text-[10px] font-medium rounded transition-all",
                    responseStyle === "detailed"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Detailed
                </button>
              </div>
            </div>

            {/* Display Mode */}
            <div className="flex items-center gap-1.5 lg:gap-2">
              <span className="text-[9px] lg:text-[10px] text-muted-foreground shrink-0">Display:</span>
              <div className="flex gap-0.5 p-0.5 rounded border border-border/50 bg-muted">
                <button
                  onClick={() => setDisplayMode("detailed")}
                  title="Show all agent reasoning and tool details"
                  className={cn(
                    "px-1.5 lg:px-2 py-0.5 text-[9px] lg:text-[10px] font-medium rounded transition-all",
                    displayMode === "detailed"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Full
                </button>
                <button
                  onClick={() => setDisplayMode("compact")}
                  title="Hide reasoning, collapse tool calls"
                  className={cn(
                    "px-1.5 lg:px-2 py-0.5 text-[9px] lg:text-[10px] font-medium rounded transition-all",
                    displayMode === "compact"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Compact
                </button>
              </div>
            </div>

            {/* Context Mode */}
            <div className="flex items-center gap-1.5 lg:gap-2">
              <span className="text-[9px] lg:text-[10px] text-muted-foreground shrink-0">Context:</span>
              <div className="flex gap-0.5 p-0.5 rounded border border-border/50 bg-muted">
                <button
                  onClick={() => setContextMode("soft")}
                  title="Warns about disabled entities but allows operations"
                  className={cn(
                    "px-1.5 lg:px-2 py-0.5 text-[9px] lg:text-[10px] font-medium rounded transition-all",
                    contextMode === "soft"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Soft
                </button>
                <button
                  onClick={() => setContextMode("strict")}
                  title="Blocks operations on disabled entities"
                  className={cn(
                    "px-1.5 lg:px-2 py-0.5 text-[9px] lg:text-[10px] font-medium rounded transition-all",
                    contextMode === "strict"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Strict
                </button>
              </div>
            </div>
          </div>

          {/* Safe Mode and Auto-context row */}
          <div className="flex items-center gap-3 lg:gap-4 mt-2 pt-2 border-t border-border/20">
            {/* Safe Mode */}
            <div className="flex items-center gap-1">
              <ShieldCheck className={cn(
                "h-3 w-3 shrink-0 transition-colors",
                safeMode ? "text-emerald-500" : "text-muted-foreground/50"
              )} />
              <Label
                className="text-[9px] lg:text-[10px] text-muted-foreground cursor-pointer"
                htmlFor="safe-mode"
              >
                Safe
              </Label>
              <Switch
                id="safe-mode"
                checked={safeMode}
                onCheckedChange={setSafeMode}
                className="scale-[0.65] lg:scale-75 shrink-0"
              />
            </div>

            {/* Auto-context */}
            <div className="flex items-center gap-1">
              <Label className="text-[9px] lg:text-[10px] text-muted-foreground cursor-pointer" htmlFor="auto-context">
                Auto-include
              </Label>
              <Switch
                id="auto-context"
                checked={autoIncludeContext}
                onCheckedChange={setAutoIncludeContext}
                className="scale-[0.65] lg:scale-75 shrink-0"
              />
            </div>

            {/* Summary and Done button inline */}
            <div className="flex-1 flex items-center justify-end gap-2">
              <span className="text-[9px] lg:text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">{enabledProviderCount}</span>/{providers.length}
              </span>
              <Button
                size="sm"
                onClick={() => setOpen(false)}
                className="h-6 lg:h-7 px-2 lg:px-3 text-[10px] lg:text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
