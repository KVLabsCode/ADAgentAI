"use client"

import { Trash2 } from "lucide-react"
import { Switch } from "@/atoms/switch"
import { Button } from "@/atoms/button"
import { Spinner } from "@/atoms/spinner"
import { NetworkLogo } from "@/components/icons/provider-logos"
import type { NetworkCredential } from "@/lib/types"

interface NetworkListItemProps {
  network: NetworkCredential
  canManage: boolean
  togglingNetwork: string | null
  onToggle: (networkId: string, enabled: boolean) => void
  onDisconnect: (networkId: string) => void
}

export function NetworkListItem({
  network,
  canManage,
  togglingNetwork,
  onToggle,
  onDisconnect,
}: NetworkListItemProps) {
  const isToggling = togglingNetwork === network.id

  return (
    <div className="flex items-center justify-between px-[var(--item-padding-x)] py-[var(--item-padding-y)] border-b border-border/40 last:border-b-0">
      <div className="flex items-center gap-[var(--item-gap)]">
        <NetworkLogo network={network.networkName} size="sm" />
        <div>
          <p className="text-[length:var(--text-label)] font-medium">
            {network.displayName}
          </p>
          <p className="text-[length:var(--text-small)] text-muted-foreground">
            Connected {new Date(network.connectedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Toggle enabled/disabled */}
        <div className="flex items-center gap-2">
          {isToggling && <Spinner size="sm" className="text-muted-foreground" />}
          <Switch
            checked={network.isEnabled}
            onCheckedChange={(checked) => onToggle(network.id, checked)}
            disabled={isToggling}
            aria-label={network.isEnabled ? "Disable network" : "Enable network"}
          />
        </div>

        {/* Disconnect button (admin only) */}
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDisconnect(network.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Disconnect {network.displayName}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
