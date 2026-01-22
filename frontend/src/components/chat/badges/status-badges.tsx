"use client"

import * as React from "react"
import { LayoutList, Shield, Sparkles } from "lucide-react"
import { Badge } from "@/atoms/badge"
import { cn } from "@/lib/utils"
import { useChatSettings } from "@/lib/chat-settings"

interface StatusBadgesProps {
  className?: string
}

export function StatusBadges({ className }: StatusBadgesProps) {
  const { displayMode, safeMode, responseStyle } = useChatSettings()

  // Only show badges for NON-default settings
  // Defaults: displayMode="compact", safeMode=false, responseStyle="concise"
  const showDetailed = displayMode === "detailed"
  const showSafe = safeMode
  const showDetailedResponse = responseStyle === "detailed"

  if (!showDetailed && !showSafe && !showDetailedResponse) {
    return null
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {showDetailed && (
        <Badge variant="status" className="gap-1 animate-badge-in">
          <LayoutList className="size-2.5" />
          Detailed view
        </Badge>
      )}
      {showSafe && (
        <Badge variant="status" className="gap-1 animate-badge-in">
          <Shield className="size-2.5" />
          Safe mode
        </Badge>
      )}
      {showDetailedResponse && (
        <Badge variant="status" className="gap-1 animate-badge-in">
          <Sparkles className="size-2.5" />
          Detailed responses
        </Badge>
      )}
    </div>
  )
}
