"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/atoms/button"
import { Badge } from "@/atoms/badge"
import { Switch } from "@/atoms/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/molecules/alert-dialog"
import { ProviderLogoBadge } from "@/components/icons/provider-logos"
import type { ProviderWithEnabled } from "@/hooks/useProviderManagement"

interface ProviderListItemProps {
  provider: ProviderWithEnabled
  canManage: boolean
  togglingProvider: string | null
  onToggleEnabled: (providerId: string, enabled: boolean) => void
  onDisconnect: (providerId: string) => void
}

export function ProviderListItem({
  provider,
  canManage,
  togglingProvider,
  onToggleEnabled,
  onDisconnect,
}: ProviderListItemProps) {
  return (
    <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[var(--item-gap)]">
          <ProviderLogoBadge type={provider.type} size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[length:var(--text-label)] font-medium">
                {provider.displayName}
              </span>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                {provider.type === "admob" ? "AdMob" : "GAM"}
              </Badge>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="text-[length:var(--text-small)] text-muted-foreground">Connected</span>
              </div>
            </div>
            <p className="text-[length:var(--text-small)] text-muted-foreground font-mono mt-0.5">
              {provider.type === "admob"
                ? provider.identifiers.publisherId
                : `${provider.identifiers.networkCode} • ${provider.identifiers.accountName}`
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-[var(--item-gap)]">
          <div className="flex items-center gap-2">
            <span className="text-[length:var(--text-small)] text-muted-foreground">
              {provider.isEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={provider.isEnabled}
              onCheckedChange={(checked) => onToggleEnabled(provider.id, checked)}
              disabled={togglingProvider === provider.id}
              className="scale-75"
            />
          </div>

          {canManage && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" />}>
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Disconnect provider</span>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-base">Disconnect {provider.displayName}?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    This will remove access to this ad platform for the entire organization. You can reconnect at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDisconnect(provider.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  )
}
