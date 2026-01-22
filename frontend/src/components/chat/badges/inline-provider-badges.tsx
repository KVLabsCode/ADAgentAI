"use client"

import * as React from "react"
import { Check, Plug } from "lucide-react"
import { cn } from "@/lib/utils"
import { AdMobLogo, GoogleAdManagerLogo } from "@/components/icons/provider-logos"
import type { Provider } from "@/lib/types"

interface InlineProviderBadgesProps {
  providers: Provider[]
  enabledProviderIds: string[]
  onToggleProvider: (providerId: string) => void
  className?: string
}

function getProviderLogo(type: string) {
  if (type === "admob") return <AdMobLogo size="sm" />
  if (type === "gam") return <GoogleAdManagerLogo size="sm" />
  return <Plug className="h-4 w-4" />
}

/**
 * Inline provider toggle badges - Perplexity style
 * Shows provider icons as small toggles below the input
 */
export function InlineProviderBadges({
  providers,
  enabledProviderIds,
  onToggleProvider,
  className,
}: InlineProviderBadgesProps) {
  if (providers.length === 0) return null

  return (
    <div
      className={cn(
        "flex items-center gap-1 py-2 px-1",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      {providers.map((provider) => {
        // If enabledProviderIds is empty, all are "enabled" (no filter)
        // If enabledProviderIds has items, check if this provider is in it
        const isSelected = enabledProviderIds.length === 0 || enabledProviderIds.includes(provider.id)

        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => onToggleProvider(provider.id)}
            className={cn(
              "group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
              "text-xs font-medium transition-all duration-150",
              "border",
              isSelected
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span className="flex items-center justify-center w-4 h-4">
              {getProviderLogo(provider.type)}
            </span>
            <span className="hidden sm:inline">{provider.displayName}</span>
            {isSelected && (
              <Check className="h-3 w-3 text-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
