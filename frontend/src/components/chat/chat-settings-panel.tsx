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
      <SheetContent className="w-[320px] sm:w-[360px] px-6">
        <SheetHeader className="space-y-1.5 pb-2">
          <SheetTitle className="text-[15px] font-medium">Chat Settings</SheetTitle>
          <SheetDescription className="text-[12px] text-muted-foreground/70">
            Choose which providers to use for this conversation.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Multi-provider warning */}
          {enabledCount > 1 && (
            <div className="flex gap-2.5 rounded-md border border-amber-500/15 bg-amber-500/[0.03] px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600/80 dark:text-amber-400/80 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                Enabling fewer providers may improve response quality. We&apos;re working on better multi-provider support.
              </p>
            </div>
          )}

          {/* Provider list */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Connected Providers
            </h4>

            {connectedProviders.length === 0 ? (
              <p className="text-[12px] text-muted-foreground/70">
                No providers connected. Connect a provider to start chatting.
              </p>
            ) : (
              <div className="space-y-2">
                {connectedProviders.map((provider) => {
                  const isEnabled = enabledProviders.includes(provider.id)

                  return (
                    <div
                      key={provider.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-md transition-colors",
                        isEnabled
                          ? "bg-muted/40"
                          : "bg-transparent hover:bg-muted/20"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            isEnabled ? "bg-emerald-500" : "bg-muted-foreground/25"
                          )}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-medium truncate">
                              {provider.displayName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground/70 shrink-0">
                              {provider.type === "admob" ? "AdMob" : "GAM"}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/50 truncate">
                            {provider.type === "admob"
                              ? provider.identifiers.publisherId
                              : `${provider.identifiers.networkCode} · ${provider.identifiers.accountName}`}
                          </p>
                        </div>
                      </div>

                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => onToggleProvider(provider.id)}
                        className="scale-[0.8] ml-2"
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
