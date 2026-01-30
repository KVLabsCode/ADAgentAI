"use client"

import { Trash2 } from "lucide-react"
import { Switch } from "@/atoms/switch"
import { Button } from "@/atoms/button"
import { Spinner } from "@/atoms/spinner"
import { NetworkLogo } from "@/components/icons/provider-logos"
import type { AdSource } from "@/lib/types"

interface AdSourceListItemProps {
  adSource: AdSource
  canManage: boolean
  togglingAdSource: string | null
  onToggle: (adSourceId: string, enabled: boolean) => void
  onDisconnect: (adSourceId: string) => void
}

export function AdSourceListItem({
  adSource,
  canManage,
  togglingAdSource,
  onToggle,
  onDisconnect,
}: AdSourceListItemProps) {
  const isToggling = togglingAdSource === adSource.id

  return (
    <div className="flex items-center justify-between px-[var(--item-padding-x)] py-[var(--item-padding-y)] border-b border-border/40 last:border-b-0">
      <div className="flex items-center gap-[var(--item-gap)]">
        <NetworkLogo network={adSource.adSourceName} size="sm" />
        <div>
          <p className="text-[length:var(--text-label)] font-medium">
            {adSource.displayName}
          </p>
          <p className="text-[length:var(--text-small)] text-muted-foreground">
            Connected {new Date(adSource.connectedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Toggle enabled/disabled */}
        <div className="flex items-center gap-2">
          {isToggling && <Spinner size="sm" className="text-muted-foreground" />}
          <Switch
            checked={adSource.isEnabled}
            onCheckedChange={(checked) => onToggle(adSource.id, checked)}
            disabled={isToggling}
            aria-label={adSource.isEnabled ? "Disable ad source" : "Enable ad source"}
          />
        </div>

        {/* Disconnect button (admin only) */}
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDisconnect(adSource.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Disconnect {adSource.displayName}</span>
          </Button>
        )}
      </div>
    </div>
  )
}

// Legacy export for backward compatibility
export { AdSourceListItem as NetworkListItem }
