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
  Check,
  Minus,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useChatSettings } from "@/lib/chat-settings"
import { useSidebar } from "@/components/ui/sidebar"
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
function TreeLine({ isLast, hasChildren, isExpanded }: { isLast: boolean; hasChildren?: boolean; isExpanded?: boolean }) {
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
        .filter(([_, apps]) => apps.some(app => app.name.toLowerCase().includes(query)))
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
        const response = await fetch(`${API_URL}/api/providers/${providerId}/apps`, {
          credentials: "include",
        })
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
    [providerApps, loadingApps, enabledAppIds, setEnabledAppIds]
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

  const totalAppsCount = Object.values(providerApps).reduce((acc, apps) => acc + apps.length, 0)

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

    return (
      <div key={provider.id} className="relative">
        {/* Provider Row */}
        <div
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 pr-3 sm:pr-4 transition-colors group",
            "hover:bg-muted/40",
            isExpanded && "bg-muted/20"
          )}
          style={{ paddingLeft: "1.75rem" }}
        >
          {/* Tree connector */}
          <div className="absolute left-2 sm:left-4 top-0 bottom-0 flex">
            <TreeLine isLast={isLast && !isExpanded} />
          </div>

          {/* Expand/collapse */}
          {canExpand ? (
            <button
              onClick={() => toggleProviderExpanded(provider.id, provider.type)}
              className={cn(
                "p-1 rounded transition-all duration-200 shrink-0",
                "hover:bg-muted-foreground/10",
                isExpanded && "bg-muted-foreground/5"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-muted-foreground" />
              ) : (
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )}
                />
              )}
            </button>
          ) : (
            <div className="w-5 sm:w-6 shrink-0" />
          )}

          {/* Checkbox */}
          <TreeCheckbox
            checked={isProviderEnabled(provider.id)}
            indeterminate={appState === "some"}
            onCheckedChange={() => toggleProvider(provider.id)}
            className="shrink-0"
          />

          {/* Provider info */}
          <div className="flex-1 min-w-0 ml-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium truncate block max-w-full",
                  highlighted && "bg-yellow-500/20 text-yellow-200 px-1 -mx-1 rounded"
                )}
              >
                {provider.displayName}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 truncate font-mono">
              {provider.type === "admob"
                ? provider.identifiers.publisherId
                : `Network: ${provider.identifiers.networkCode}`}
            </p>
          </div>

          {/* App count pill */}
          {allApps.length > 0 && (
            <div
              className={cn(
                "px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium transition-colors shrink-0",
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
            style={{ marginLeft: "1.5rem" }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2 sm:gap-3 py-3 sm:py-4 pl-4 sm:pl-6 text-xs sm:text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                <span>Loading apps...</span>
              </div>
            ) : filteredAppsList.length === 0 ? (
              <div className="py-2.5 sm:py-3 pl-4 sm:pl-6 text-xs sm:text-sm text-muted-foreground/60">
                {searchQuery ? "No matching apps" : "No apps found"}
              </div>
            ) : (
              <div className="py-1">
                {/* Select all */}
                <div className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2 pl-4 sm:pl-6 pr-3 sm:pr-4 hover:bg-muted/30 transition-colors">
                  <TreeCheckbox
                    checked={appState === "all"}
                    indeterminate={appState === "some"}
                    onCheckedChange={() => toggleAllApps(provider.id)}
                    className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0"
                  />
                  <span className="text-[11px] sm:text-xs text-muted-foreground">Select all</span>
                </div>

                {/* App list */}
                {filteredAppsList.map((app, appIndex) => {
                  const appHighlighted = matchesSearch(app.name)
                  const isLastApp = appIndex === filteredAppsList.length - 1

                  return (
                    <div
                      key={app.id}
                      className={cn(
                        "flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2 pl-4 sm:pl-6 pr-3 sm:pr-4 transition-colors",
                        "hover:bg-muted/30 group/app"
                      )}
                    >
                      {/* App tree connector */}
                      <div className="relative -ml-2 w-3 sm:w-4 h-full flex items-center shrink-0">
                        <div
                          className={cn(
                            "absolute left-0 w-px bg-border/40",
                            isLastApp ? "top-0 h-1/2" : "top-0 bottom-0 -translate-y-full h-[200%]"
                          )}
                        />
                        <div className="absolute left-0 w-1.5 sm:w-2 h-px bg-border/40" />
                      </div>

                      <TreeCheckbox
                        checked={isAppEnabled(provider.id, app.id)}
                        onCheckedChange={() => toggleApp(provider.id, app.id)}
                        className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0"
                      />

                      <Smartphone
                        className={cn(
                          "h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 transition-colors",
                          app.platform === "ANDROID"
                            ? "text-green-500"
                            : "text-blue-500"
                        )}
                      />

                      <span
                        className={cn(
                          "text-[11px] sm:text-xs flex-1 truncate min-w-0",
                          appHighlighted && "bg-yellow-500/20 text-yellow-200 px-1 -mx-1 rounded"
                        )}
                      >
                        {app.name}
                      </span>

                      <span className="text-[9px] sm:text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wide shrink-0 hidden xs:block">
                        {app.platform === "ANDROID" ? "Android" : app.platform === "IOS" ? "iOS" : ""}
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
            "flex items-center gap-2 sm:gap-3 w-full px-3 sm:px-5 py-2.5 sm:py-3 transition-colors",
            "hover:bg-muted/30",
            isExpanded && "bg-muted/10"
          )}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
              isExpanded && "rotate-90"
            )}
          />
          <div className={cn("p-1.5 rounded-md shrink-0", iconColor)}>
            {icon}
          </div>
          <span className="text-sm font-semibold flex-1 text-left truncate">{title}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {enabledCount}/{providerList.length}
            </span>
            <div
              className={cn(
                "w-2 h-2 rounded-full",
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
          <div className="pb-2">
            {filteredList.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 px-3 sm:px-5 py-3">
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
      <div className="flex items-center gap-2 sm:gap-3 w-full px-3 sm:px-5 py-2.5 sm:py-3 opacity-40">
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className={cn("p-1.5 rounded-md shrink-0", iconColor)}>
          {icon}
        </div>
        <span className="text-xs sm:text-sm font-medium flex-1 text-left truncate">{title}</span>
        <span className="text-[9px] sm:text-[10px] text-muted-foreground bg-muted/50 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
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
        className="w-[calc(100%-2rem)] sm:max-w-[680px] p-0 gap-0 max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden border-border/50 bg-background/95 backdrop-blur-xl"
        style={{ left: isMobile ? "50%" : dialogOffset }}
      >
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/30 shrink-0 bg-muted/20">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
              <Settings2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg font-semibold truncate">Context Settings</DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                Select accounts and apps for your queries
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-border/20 shrink-0 bg-background">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Search accounts, apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 h-9 sm:h-10 text-sm bg-muted/30 border-border/30",
                "focus:bg-muted/50 focus:border-border/50 transition-colors"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="py-2">
            {/* AdMob Section */}
            {admobProviders.length > 0 &&
              renderSection(
                "admob",
                "AdMob Accounts",
                <Building2 className="h-4 w-4 text-orange-400" />,
                "bg-orange-500/10",
                admobProviders,
                filteredAdmobProviders
              )}

            {/* GAM Section */}
            {gamProviders.length > 0 &&
              renderSection(
                "gam",
                "Ad Manager Networks",
                <Layers className="h-4 w-4 text-blue-400" />,
                "bg-blue-500/10",
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

        {/* Footer */}
        <div className="border-t border-border/30 p-4 sm:p-5 shrink-0 bg-muted/10">
          {/* Controls row - stack on mobile, inline on larger screens */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Response Style - segmented control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs text-muted-foreground shrink-0">Response:</span>
              <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                <button
                  onClick={() => setResponseStyle("concise")}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
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
                    "px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                    responseStyle === "detailed"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Detailed
                </button>
              </div>
            </div>

            {/* Auto-context - inline with switch */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground cursor-pointer truncate" htmlFor="auto-context">
                Auto-include context
              </Label>
              <Switch
                id="auto-context"
                checked={autoIncludeContext}
                onCheckedChange={setAutoIncludeContext}
                className="scale-90 shrink-0"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-border/20">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{enabledProviderCount}</span>
                {" "}of {providers.length} accounts
              </span>
              {totalAppsCount > 0 && (
                <span>
                  <span className="font-medium text-foreground">
                    {Object.entries(enabledAppIds).reduce((acc, [pid, ids]) => {
                      const all = providerApps[pid]?.length || 0
                      return acc + (ids?.length || all)
                    }, 0)}
                  </span>
                  {" "}of {totalAppsCount} apps
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 px-4 w-full sm:w-auto"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
