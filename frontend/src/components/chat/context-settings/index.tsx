"use client"

import * as React from "react"
import {
  Plug,
  Search,
  LayoutGrid,
  Network,
  FileText,
  Target,
  Palette,
  X,
  Layers,
  Settings2,
} from "lucide-react"
import { Button } from "@/atoms/button"
import { Input } from "@/atoms/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/molecules/dialog"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/molecules/scroll-area"
import { AdMobLogo, GoogleAdManagerLogo } from "@/components/icons/provider-logos"
import { useChatSettings } from "@/lib/chat-settings"
import { useSidebar } from "@/organisms/sidebar"
import { useUser } from "@/hooks/use-user"
import type { Provider } from "@/lib/types"
import type { ContextSettingsProps } from "./types"
import { useProviderExpansion, useProviderApps } from "./hooks"
import {
  isProviderEnabled as checkProviderEnabled,
  isAppEnabled as checkAppEnabled,
  getProviderAppState,
  filterProviders,
  filterApps,
} from "./utils"
import { ProviderRow } from "./provider-row"
import { ProviderSection, PlaceholderSection } from "./provider-section"
import { FooterControls } from "./footer-controls"

export function ContextSettings({ providers }: ContextSettingsProps) {
  const { getAccessToken } = useUser()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const { state: sidebarState, isMobile } = useSidebar()

  // Calculate dialog offset based on sidebar state
  const dialogOffset = isMobile
    ? "50%"
    : sidebarState === "expanded"
      ? "calc(50% + 8rem)"
      : "calc(50% + 1.5rem)"

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

  // Provider apps hook
  const { providerApps, fetchApps, isLoading: isAppsLoading, getApps } = useProviderApps({
    enabledAppIds,
    setEnabledAppIds,
    getAccessToken,
  })

  // Provider expansion hook
  const {
    expandedSections: _expandedSections,
    toggleSection,
    toggleProviderExpanded,
    isSectionExpanded,
    isProviderExpanded,
  } = useProviderExpansion({
    searchQuery,
    providerApps,
    onExpandProvider: (providerId, providerType) => {
      if (providerType === "admob") {
        fetchApps(providerId)
      }
    },
  })

  const activeProviders = providers.filter((p) => p.isEnabled !== false)
  const admobProviders = activeProviders.filter((p) => p.type === "admob")
  const gamProviders = activeProviders.filter((p) => p.type === "gam")
  const hasProviders = activeProviders.length > 0

  // Initialize enabled providers
  React.useEffect(() => {
    if (activeProviders.length > 0 && enabledProviderIds.length === 0) {
      setEnabledProviderIds(activeProviders.map((p) => p.id))
    }
  }, [activeProviders, enabledProviderIds.length, setEnabledProviderIds])

  // Helper functions using extracted utils
  const isProviderEnabled = React.useCallback(
    (id: string) => checkProviderEnabled(id, enabledProviderIds),
    [enabledProviderIds]
  )

  const isAppEnabled = React.useCallback(
    (providerId: string, appId: string) =>
      checkAppEnabled(providerId, appId, enabledAppIds),
    [enabledAppIds]
  )

  const toggleAllApps = React.useCallback(
    (providerId: string) => {
      const apps = getApps(providerId)
      const currentState = getProviderAppState(providerId, providerApps, enabledAppIds)
      if (currentState === "all") {
        setEnabledAppIds(providerId, [])
      } else {
        setEnabledAppIds(providerId, apps.map((app) => app.id))
      }
    },
    [getApps, providerApps, enabledAppIds, setEnabledAppIds]
  )

  // Filtered providers
  const filteredAdmobProviders = filterProviders(admobProviders, searchQuery, providerApps)
  const filteredGamProviders = filterProviders(gamProviders, searchQuery, providerApps)

  const enabledProviderCount =
    enabledProviderIds.length === 0
      ? activeProviders.length
      : enabledProviderIds.filter((id) => activeProviders.some((p) => p.id === id)).length

  // Render a provider row
  const renderProvider = React.useCallback(
    (provider: Provider, index: number, total: number) => {
      const allApps = getApps(provider.id)
      const filteredAppsList = filterApps(allApps, searchQuery)
      const appState = getProviderAppState(provider.id, providerApps, enabledAppIds)

      return (
        <ProviderRow
          key={provider.id}
          provider={provider}
          index={index}
          total={total}
          isExpanded={isProviderExpanded(provider.id)}
          isLoading={isAppsLoading(provider.id)}
          allApps={allApps}
          filteredApps={filteredAppsList}
          appState={appState}
          isEnabled={isProviderEnabled(provider.id)}
          searchQuery={searchQuery}
          enabledAppIds={enabledAppIds[provider.id] || []}
          onToggleExpanded={toggleProviderExpanded}
          onToggleProvider={toggleProvider}
          onToggleAllApps={toggleAllApps}
          onToggleApp={toggleApp}
          isAppEnabled={isAppEnabled}
        />
      )
    },
    [
      getApps,
      searchQuery,
      providerApps,
      enabledAppIds,
      isProviderExpanded,
      isAppsLoading,
      isProviderEnabled,
      toggleProviderExpanded,
      toggleProvider,
      toggleAllApps,
      toggleApp,
      isAppEnabled,
    ]
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 rounded-full transition-colors duration-200",
              hasProviders
                ? "text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            disabled={!hasProviders}
          />
        }
      >
        <Plug className="h-3.5 w-3.5" />
        <span className="sr-only">Context settings</span>
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
              <DialogTitle className="text-xs lg:text-sm font-medium">
                Context Settings
              </DialogTitle>
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
          <ScrollArea style={{ maxHeight: "calc(65vh - 180px)" }}>
            <div className="py-2">
              {/* AdMob Section */}
              {admobProviders.length > 0 && (
                <ProviderSection
                  id="admob"
                  title="AdMob Accounts"
                  icon={<AdMobLogo size="sm" />}
                  providerList={admobProviders}
                  filteredList={filteredAdmobProviders}
                  isExpanded={isSectionExpanded("admob")}
                  onToggleSection={toggleSection}
                  isProviderEnabled={isProviderEnabled}
                  renderProvider={renderProvider}
                />
              )}

              {/* GAM Section */}
              {gamProviders.length > 0 && (
                <ProviderSection
                  id="gam"
                  title="Ad Manager Networks"
                  icon={<GoogleAdManagerLogo size="sm" />}
                  providerList={gamProviders}
                  filteredList={filteredGamProviders}
                  isExpanded={isSectionExpanded("gam")}
                  onToggleSection={toggleSection}
                  isProviderEnabled={isProviderEnabled}
                  renderProvider={renderProvider}
                />
              )}

              {/* Placeholders */}
              {admobProviders.length > 0 && (
                <>
                  <PlaceholderSection
                    title="Ad Units"
                    icon={<LayoutGrid className="h-4 w-4 text-emerald-400" />}
                    iconColor="bg-emerald-500/10"
                  />
                  <PlaceholderSection
                    title="Mediation Groups"
                    icon={<Layers className="h-4 w-4 text-purple-400" />}
                    iconColor="bg-purple-500/10"
                  />
                  <PlaceholderSection
                    title="Ad Sources"
                    icon={<Network className="h-4 w-4 text-cyan-400" />}
                    iconColor="bg-cyan-500/10"
                  />
                </>
              )}

              {gamProviders.length > 0 && (
                <>
                  <PlaceholderSection
                    title="GAM Ad Units"
                    icon={<LayoutGrid className="h-4 w-4 text-indigo-400" />}
                    iconColor="bg-indigo-500/10"
                  />
                  <PlaceholderSection
                    title="Line Items"
                    icon={<FileText className="h-4 w-4 text-amber-400" />}
                    iconColor="bg-amber-500/10"
                  />
                  <PlaceholderSection
                    title="Orders"
                    icon={<Target className="h-4 w-4 text-red-400" />}
                    iconColor="bg-red-500/10"
                  />
                  <PlaceholderSection
                    title="Creatives"
                    icon={<Palette className="h-4 w-4 text-pink-400" />}
                    iconColor="bg-pink-500/10"
                  />
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <FooterControls
          responseStyle={responseStyle}
          displayMode={displayMode}
          contextMode={contextMode}
          safeMode={safeMode}
          autoIncludeContext={autoIncludeContext}
          enabledProviderCount={enabledProviderCount}
          totalProviderCount={activeProviders.length}
          onResponseStyleChange={setResponseStyle}
          onDisplayModeChange={setDisplayMode}
          onContextModeChange={setContextMode}
          onSafeModeChange={setSafeMode}
          onAutoIncludeContextChange={setAutoIncludeContext}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

// Re-export for backward compatibility
export type { ContextSettingsProps } from "./types"
