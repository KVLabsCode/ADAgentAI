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
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-medium">Chat</h1>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="h-7 w-7"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="sr-only">Chat settings</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Provider settings</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
