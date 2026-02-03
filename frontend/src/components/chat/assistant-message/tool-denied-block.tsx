"use client"

import { memo } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/atoms/badge"
import { IconBox } from "./icon-box"
import { CARD_HEIGHT, CARD_PADDING, getShortToolName } from "./utils"

interface ToolDeniedBlockProps {
  toolName: string
  reason: string
}

/**
 * ToolDeniedBlock - Displays a denied tool call (always collapsed/compact)
 */
export const ToolDeniedBlock = memo(function ToolDeniedBlock({ toolName, reason }: ToolDeniedBlockProps) {
  const shortName = getShortToolName(toolName)

  return (
    <div className={cn(CARD_HEIGHT, CARD_PADDING, "flex items-center justify-between gap-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50")}>
      <div className="flex items-center gap-2.5 min-w-0">
        <IconBox color="red">
          <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        </IconBox>
        <code className="text-xs font-medium text-zinc-900 dark:text-zinc-300 font-mono truncate">{shortName}</code>
        <span className="text-[10px] text-zinc-500 truncate">{reason}</span>
      </div>
      <Badge className="h-5 gap-1 text-[9px] font-semibold uppercase tracking-wide px-1.5 border-0 leading-none bg-red-500/20 text-red-400 shrink-0">
        Denied
      </Badge>
    </div>
  )
})
