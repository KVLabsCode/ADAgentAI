"use client"

import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AdMobLogo, ProviderLogoBadge } from "@/components/icons/provider-logos"

interface ConnectProviderDropdownProps {
  connectingType: string | null
  onConnect: (type: "admob" | "gam") => void
  variant?: "default" | "empty"
}

export function ConnectProviderDropdown({
  connectingType,
  onConnect,
  variant = "default",
}: ConnectProviderDropdownProps) {
  const buttonText = variant === "empty" ? "Connect provider" : "Connect"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 text-xs">
          <Plus className="mr-1 h-3 w-3" />
          {buttonText}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => onConnect("admob")}
          disabled={!!connectingType}
          className="text-xs"
        >
          <div className="flex items-center gap-2">
            {connectingType === 'admob' ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <AdMobLogo size="sm" />
            )}
            <span>{connectingType === 'admob' ? 'Connecting...' : 'AdMob'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onConnect("gam")}
          disabled={true}
          className="text-xs"
        >
          <div className="flex items-center gap-2">
            <ProviderLogoBadge type="gam" size="sm" disabled />
            <span className="flex-1 text-muted-foreground">Google Ad Manager</span>
            <Badge variant="outline" className="text-[8px] h-3 px-1 border-border/40 text-muted-foreground/60 leading-none">
              Soon
            </Badge>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
