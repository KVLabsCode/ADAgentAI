"use client"

import { memo, useState } from "react"
import { ChevronDown, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/molecules/collapsible"
import { IconBox } from "./icon-box"
import { CARD_HEIGHT, CARD_PADDING } from "./utils"
import type { StreamEventItem } from "@/lib/types"

interface ActivitySummaryBlockProps {
  events: StreamEventItem[]
  children: React.ReactNode
}

/**
 * ActivitySummaryBlock - Collapsible summary of tool activity
 */
export const ActivitySummaryBlock = memo(function ActivitySummaryBlock({
  events,
  children,
}: ActivitySummaryBlockProps) {
  const [isOpen, setIsOpen] = useState(false)
  const toolEvents = events.filter(e => e.type === "tool")
  const stepCount = toolEvents.length

  if (stepCount === 0) return <>{children}</>

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
        <CollapsibleTrigger
          render={
            <button className={cn(CARD_HEIGHT, CARD_PADDING, "w-full flex items-center justify-between gap-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors")} />
          }
        >
          <div className="flex items-center gap-2.5 h-full">
            <IconBox color="zinc">
              <Terminal className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" />
            </IconBox>
            <span className="text-xs text-zinc-900 dark:text-zinc-200">
              <span className="font-medium">{stepCount}</span>
              <span className="text-zinc-500 dark:text-zinc-400 ml-1">{stepCount === 1 ? 'tool call' : 'tool calls'}</span>
            </span>
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform duration-200", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-2 border-t border-zinc-200 dark:border-zinc-700/50 mt-1">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
})
