"use client"

import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface ChatHeaderProps {
  onSettingsClick: () => void
  hasProviders: boolean
}

export function ChatHeader({ onSettingsClick, hasProviders }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-2.5 border-b border-border/20">
      <div className="flex items-center gap-2">
        <h1 className="text-[13px] font-medium tracking-tight text-foreground/90">Chat</h1>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="h-6 w-6 text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/50"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="sr-only">Chat settings</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px]">
          Provider settings
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
