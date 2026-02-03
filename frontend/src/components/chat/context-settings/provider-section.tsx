import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProviderSectionProps } from "./types"

/**
 * Provider section component (AdMob, GAM, etc.) with expand/collapse.
 * Memoized to prevent re-renders when other sections change.
 */
export const ProviderSection = React.memo(function ProviderSection({
  id,
  title,
  icon,
  providerList,
  filteredList,
  isExpanded,
  onToggleSection,
  isProviderEnabled,
  renderProvider,
}: ProviderSectionProps) {
  const enabledCount = providerList.filter((p) => isProviderEnabled(p.id)).length

  return (
    <div className="border-b border-border/20 last:border-b-0">
      {/* Section header */}
      <button
        onClick={() => onToggleSection(id)}
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
        <div className="p-1 rounded shrink-0">{icon}</div>
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
              No matching accounts
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
})

interface PlaceholderSectionProps {
  title: string
  icon: React.ReactNode
  iconColor: string
}

/**
 * Placeholder section for upcoming features.
 * Memoized since it never changes.
 */
export const PlaceholderSection = React.memo(function PlaceholderSection({
  title,
  icon,
  iconColor,
}: PlaceholderSectionProps) {
  return (
    <div className="border-b border-border/20 last:border-b-0">
      <div className="flex items-center gap-2 w-full px-3 py-1.5 opacity-40">
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className={cn("p-1 rounded shrink-0", iconColor)}>{icon}</div>
        <span className="text-xs font-medium flex-1 text-left truncate">{title}</span>
        <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full shrink-0">
          Soon
        </span>
      </div>
    </div>
  )
})
