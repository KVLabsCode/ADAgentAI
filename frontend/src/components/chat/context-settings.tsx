"use client"

import * as React from "react"
import { Plug, ChevronDown, ChevronRight, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useChatSettings, type ResponseStyle } from "@/lib/chat-settings"
import type { Provider } from "@/lib/types"

interface ContextSettingsProps {
  providers: Provider[]
}

export function ContextSettings({ providers }: ContextSettingsProps) {
  const [open, setOpen] = React.useState(false)
  const [admobOpen, setAdmobOpen] = React.useState(true)
  const [gamOpen, setGamOpen] = React.useState(true)

  const {
    responseStyle,
    enabledProviderIds,
    autoIncludeContext,
    setResponseStyle,
    toggleProvider,
    setAutoIncludeContext,
    setEnabledProviderIds,
  } = useChatSettings()

  const admobProviders = providers.filter((p) => p.type === "admob")
  const gamProviders = providers.filter((p) => p.type === "gam")
  const hasProviders = providers.length > 0

  // Initialize enabled providers when providers load (if empty, enable all)
  React.useEffect(() => {
    if (providers.length > 0 && enabledProviderIds.length === 0) {
      setEnabledProviderIds(providers.map((p) => p.id))
    }
  }, [providers, enabledProviderIds.length, setEnabledProviderIds])

  // Check if a provider is enabled
  const isProviderEnabled = (id: string) => {
    // If no explicit selection, all are enabled
    if (enabledProviderIds.length === 0) return true
    return enabledProviderIds.includes(id)
  }

  // Count enabled providers
  const enabledCount = enabledProviderIds.length === 0
    ? providers.length
    : enabledProviderIds.filter((id) => providers.some((p) => p.id === id)).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-full transition-colors",
            hasProviders
              ? "text-muted-foreground/70 hover:text-foreground/80"
              : "text-muted-foreground/40 cursor-not-allowed"
          )}
          disabled={!hasProviders}
        >
          <Plug className="h-3.5 w-3.5" />
          <span className="sr-only">Context settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Context Settings</h4>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Configure which accounts and settings to use
          </p>
        </div>

        <div className="max-h-[320px] overflow-y-auto">
          {/* AdMob Accounts */}
          {admobProviders.length > 0 && (
            <Collapsible open={admobOpen} onOpenChange={setAdmobOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  {admobOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium">AdMob Accounts</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({admobProviders.filter((p) => isProviderEnabled(p.id)).length}/{admobProviders.length})
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-2 space-y-1">
                  {admobProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between py-1.5 pl-5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {provider.displayName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {provider.identifiers.publisherId}
                        </p>
                      </div>
                      <Switch
                        checked={isProviderEnabled(provider.id)}
                        onCheckedChange={() => toggleProvider(provider.id)}
                        className="scale-75"
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* GAM Networks */}
          {gamProviders.length > 0 && (
            <Collapsible open={gamOpen} onOpenChange={setGamOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/50 transition-colors border-t border-border/30">
                <div className="flex items-center gap-2">
                  {gamOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium">Ad Manager Networks</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({gamProviders.filter((p) => isProviderEnabled(p.id)).length}/{gamProviders.length})
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-2 space-y-1">
                  {gamProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between py-1.5 pl-5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {provider.displayName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Network: {provider.identifiers.networkCode}
                        </p>
                      </div>
                      <Switch
                        checked={isProviderEnabled(provider.id)}
                        onCheckedChange={() => toggleProvider(provider.id)}
                        className="scale-75"
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Settings Section */}
          <div className="border-t border-border/30 p-3 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Response Style</Label>
              <div className="flex gap-1">
                <Button
                  variant={responseStyle === "concise" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => setResponseStyle("concise")}
                >
                  Concise
                </Button>
                <Button
                  variant={responseStyle === "detailed" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => setResponseStyle("detailed")}
                >
                  Detailed
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-medium">Auto-include context</Label>
                <p className="text-[10px] text-muted-foreground">
                  Include selected accounts info automatically
                </p>
              </div>
              <Switch
                checked={autoIncludeContext}
                onCheckedChange={setAutoIncludeContext}
                className="scale-75"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border/30 bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            {enabledCount} of {providers.length} accounts active
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
