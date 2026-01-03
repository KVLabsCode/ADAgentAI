"use client"

import { AlertTriangle } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Provider } from "@/lib/types"

interface ChatSettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providers: Provider[]
  enabledProviders: string[]
  onToggleProvider: (providerId: string) => void
}

export function ChatSettingsPanel({
  open,
  onOpenChange,
  providers,
  enabledProviders,
  onToggleProvider,
}: ChatSettingsPanelProps) {
  const connectedProviders = providers.filter(p => p.status === "connected")
  const enabledCount = enabledProviders.length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Chat Settings</SheetTitle>
          <SheetDescription>
            Choose which providers to use for this conversation.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Multi-provider warning */}
          {enabledCount > 1 && (
            <div className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Enabling fewer providers may improve response quality. We&apos;re working on better multi-provider support.
              </p>
            </div>
          )}

          {/* Provider list */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Connected Providers</h4>

            {connectedProviders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No providers connected. Connect a provider to start chatting.
              </p>
            ) : (
              <div className="space-y-3">
                {connectedProviders.map((provider) => {
                  const isEnabled = enabledProviders.includes(provider.id)

                  return (
                    <div
                      key={provider.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        isEnabled ? "bg-muted/50" : "bg-background"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            isEnabled ? "bg-green-500" : "bg-muted-foreground/30"
                          )}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {provider.displayName}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {provider.type === "admob" ? "AdMob" : "GAM"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {provider.type === "admob"
                              ? provider.identifiers.publisherId
                              : `${provider.identifiers.networkCode} • ${provider.identifiers.accountName}`}
                          </p>
                        </div>
                      </div>

                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => onToggleProvider(provider.id)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
