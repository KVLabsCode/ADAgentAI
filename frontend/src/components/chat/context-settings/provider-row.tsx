import * as React from "react"
import { ChevronRight } from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { cn } from "@/lib/utils"
import type { ProviderApp } from "@/lib/types"
import type { ProviderRowProps, AppState } from "./types"
import { TreeCheckbox } from "./tree-checkbox"
import { TreeLine } from "./tree-line"
import { PlatformIcon } from "./platform-icon"
import { matchesSearch } from "./utils"

interface AppRowProps {
  app: ProviderApp
  providerId: string
  isEnabled: boolean
  providerEnabled: boolean
  isLastApp: boolean
  searchQuery: string
  onToggleApp: (providerId: string, appId: string) => void
  isAppEnabled: (providerId: string, appId: string) => boolean
}

/**
 * Individual app row within a provider's expanded view.
 * Memoized to prevent re-renders when sibling apps change.
 */
const AppRow = React.memo(function AppRow({
  app,
  providerId,
  isEnabled,
  providerEnabled,
  isLastApp,
  searchQuery,
  onToggleApp,
  isAppEnabled,
}: AppRowProps) {
  const appHighlighted = matchesSearch(app.name, searchQuery)
  const appEnabled = providerEnabled && isAppEnabled(providerId, app.id)

  return (
    <div
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
        checked={isAppEnabled(providerId, app.id)}
        onCheckedChange={() => onToggleApp(providerId, app.id)}
        className="h-3 w-3 shrink-0"
      />

      <PlatformIcon platform={app.platform} />

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
})

interface AppListProps {
  providerId: string
  allApps: ProviderApp[]
  filteredApps: ProviderApp[]
  appState: AppState
  isLoading: boolean
  isEnabled: boolean
  searchQuery: string
  onToggleAllApps: (providerId: string) => void
  onToggleApp: (providerId: string, appId: string) => void
  isAppEnabled: (providerId: string, appId: string) => boolean
}

/**
 * App list container within a provider's expanded view.
 * Memoized to prevent re-renders when provider header changes.
 */
const AppList = React.memo(function AppList({
  providerId,
  allApps: _allApps,
  filteredApps,
  appState,
  isLoading,
  isEnabled,
  searchQuery,
  onToggleAllApps,
  onToggleApp,
  isAppEnabled,
}: AppListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 pl-3 text-[10px] text-muted-foreground">
        <Spinner size="xs" />
        <span>Loading apps...</span>
      </div>
    )
  }

  if (filteredApps.length === 0) {
    return (
      <div className="py-2 pl-3 text-[10px] text-muted-foreground/60">
        {searchQuery ? "No matching apps" : "No apps found"}
      </div>
    )
  }

  return (
    <div className="py-0.5">
      {/* Select all */}
      <div
        className={cn(
          "flex items-center gap-2 py-1 pl-3 pr-3 hover:bg-muted/30 transition-colors",
          !isEnabled && "opacity-50 pointer-events-none"
        )}
      >
        <TreeCheckbox
          checked={appState === "all"}
          indeterminate={appState === "some"}
          onCheckedChange={() => onToggleAllApps(providerId)}
          className="h-3 w-3 shrink-0"
        />
        <span className="text-[10px] text-muted-foreground">Select all</span>
      </div>

      {/* App list */}
      {filteredApps.map((app, appIndex) => (
        <AppRow
          key={app.id}
          app={app}
          providerId={providerId}
          isEnabled={isEnabled}
          providerEnabled={isEnabled}
          isLastApp={appIndex === filteredApps.length - 1}
          searchQuery={searchQuery}
          onToggleApp={onToggleApp}
          isAppEnabled={isAppEnabled}
        />
      ))}
    </div>
  )
})

interface AppCountPillProps {
  allAppsCount: number
  enabledCount: number
  appState: AppState
}

/**
 * App count pill showing selected/total apps.
 * Memoized since it's recalculated on every app toggle.
 */
const AppCountPill = React.memo(function AppCountPill({
  allAppsCount,
  enabledCount,
  appState,
}: AppCountPillProps) {
  if (allAppsCount === 0) return null

  return (
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
      {appState === "all" ? `${allAppsCount}` : `${enabledCount}/${allAppsCount}`}
    </div>
  )
})

/**
 * Provider row component that renders a single provider with expand/collapse
 * functionality and nested app list.
 * Memoized to prevent re-renders when sibling providers change.
 */
export const ProviderRow = React.memo(function ProviderRow({
  provider,
  index,
  total,
  isExpanded,
  isLoading,
  allApps,
  filteredApps,
  appState,
  isEnabled,
  searchQuery,
  enabledAppIds,
  onToggleExpanded,
  onToggleProvider,
  onToggleAllApps,
  onToggleApp,
  isAppEnabled,
}: ProviderRowProps) {
  const canExpand = provider.type === "admob"
  const isLast = index === total - 1
  const highlighted = matchesSearch(provider.displayName, searchQuery)

  return (
    <div className="relative">
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
            onClick={() => onToggleExpanded(provider.id, provider.type)}
            className={cn(
              "p-0.5 rounded transition-colors duration-200 shrink-0",
              "hover:bg-muted-foreground/10",
              isExpanded && "bg-muted-foreground/5"
            )}
          >
            {isLoading ? (
              <Spinner size="xs" className="text-muted-foreground" />
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
          checked={isEnabled}
          indeterminate={appState === "some"}
          onCheckedChange={() => onToggleProvider(provider.id)}
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
        <AppCountPill
          allAppsCount={allApps.length}
          enabledCount={enabledAppIds.length}
          appState={appState}
        />
      </div>

      {/* Apps (expanded) */}
      {isExpanded && canExpand && (
        <div
          className={cn(
            "relative overflow-hidden",
            "border-l border-border/30"
          )}
          style={{ marginLeft: "1.25rem" }}
        >
          <AppList
            providerId={provider.id}
            allApps={allApps}
            filteredApps={filteredApps}
            appState={appState}
            isLoading={isLoading}
            isEnabled={isEnabled}
            searchQuery={searchQuery}
            onToggleAllApps={onToggleAllApps}
            onToggleApp={onToggleApp}
            isAppEnabled={isAppEnabled}
          />
        </div>
      )}
    </div>
  )
})
