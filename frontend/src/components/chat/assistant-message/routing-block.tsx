"use client"

import * as React from "react"
import { memo, useState } from "react"
import { Brain, ChevronDown, Route } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/molecules/collapsible"
import { IconBox } from "./icon-box"
import { CARD_HEIGHT, CARD_PADDING, formatModelName } from "./utils"

interface RoutingBlockProps {
  service: string
  capability: string
  thinking?: string
  model_selected?: string
}

/**
 * RoutingBlock - Displays query routing information with optional reasoning
 */
export const RoutingBlock = memo(function RoutingBlock({
  service,
  capability,
  thinking,
  model_selected,
}: RoutingBlockProps) {
  const [isOpen, setIsOpen] = useState(false)
  const modelDisplay = formatModelName(model_selected)

  // Compact version without thinking
  if (!thinking) {
    return (
      <div className={cn(CARD_HEIGHT, CARD_PADDING, "flex items-center justify-between gap-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50")}>
        <div className="flex items-center gap-2.5">
          <IconBox color="violet">
            <Route className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          </IconBox>
          <span className="text-xs text-zinc-900 dark:text-zinc-200">
            <span className="text-zinc-500 dark:text-zinc-400">Routing to</span>{" "}
            <span className="font-medium text-zinc-950 dark:text-zinc-100">{service}</span>
            <span className="mx-1.5 text-zinc-400 dark:text-zinc-500">→</span>
            <span className="font-medium text-zinc-950 dark:text-zinc-100">{capability}</span>
          </span>
        </div>
        {modelDisplay && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 shrink-0">
            {modelDisplay}
          </span>
        )}
      </div>
    )
  }

  // Expandable version with thinking
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50">
        <CollapsibleTrigger
          render={
            <button className={cn(CARD_HEIGHT, CARD_PADDING, "w-full flex items-center justify-between gap-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors")} />
          }
        >
          <div className="flex items-center gap-2.5 min-w-0 h-full">
            <IconBox color="violet">
              <Route className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </IconBox>
            <span className="text-xs text-zinc-900 dark:text-zinc-200 truncate">
              <span className="text-zinc-500 dark:text-zinc-400">Routing to</span>{" "}
              <span className="font-medium text-zinc-950 dark:text-zinc-100">{service}</span>
              <span className="mx-1.5 text-zinc-400 dark:text-zinc-500">→</span>
              <span className="font-medium text-zinc-950 dark:text-zinc-100">{capability}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 shrink-0 h-full">
            {modelDisplay && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                {modelDisplay}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Brain className="h-3 w-3" />
              <span className="text-[10px]">reasoning</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-2">
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {thinking}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
})
