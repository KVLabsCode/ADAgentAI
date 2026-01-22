"use client"

import { Plus } from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { Button } from "@/atoms/button"
import { Badge } from "@/atoms/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/molecules/dropdown-menu"
import { AdMobLogo, ProviderLogoBadge, AppLovinLogo } from "@/components/icons/provider-logos"

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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => onConnect("admob")}
          disabled={!!connectingType}
          className="text-xs"
        >
          <div className="flex items-center gap-2">
            {connectingType === 'admob' ? (
              <Spinner size="sm" className="text-muted-foreground" />
            ) : (
              <AdMobLogo size="sm" />
            )}
            <span>{connectingType === 'admob' ? 'Connecting...' : 'AdMob'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onConnect("gam")}
          disabled={true}
          className="text-xs w-full"
        >
          <div className="flex items-center gap-2 w-full">
            <ProviderLogoBadge type="gam" size="sm" disabled />
            <span className="flex-1 text-muted-foreground">Google Ad Manager</span>
            <Badge variant="outline" className="text-[8px] h-3 px-1 border-border/40 text-muted-foreground/60 leading-none">
              Soon
            </Badge>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={true}
          className="text-xs w-full"
        >
          <div className="flex items-center gap-2 w-full">
            <AppLovinLogo size="sm" disabled />
            <span className="flex-1 text-muted-foreground">AppLovin MAX</span>
            <Badge variant="outline" className="text-[8px] h-3 px-1 border-border/40 text-muted-foreground/60 leading-none">
              Soon
            </Badge>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
