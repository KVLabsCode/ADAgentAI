"use client"

import { memo, useState } from "react"
import { Brain, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/molecules/collapsible"
import { IconBox } from "./icon-box"
import { CARD_HEIGHT, CARD_PADDING } from "./utils"

interface ThinkingBlockProps {
  content: string
}

/**
 * ThinkingBlock - Displays agent thinking/reasoning (collapsed by default)
 */
export const ThinkingBlock = memo(function ThinkingBlock({ content }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50">
        <CollapsibleTrigger
          render={
            <button className={cn(CARD_HEIGHT, CARD_PADDING, "w-full flex items-center justify-between gap-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors")} />
          }
        >
          <div className="flex items-center gap-2.5">
            <IconBox color="amber">
              <Brain className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </IconBox>
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-200">Thinking...</span>
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-2">
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
})
