"use client"

import * as React from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface DisclosureBlockProps {
  label: string
  expandedLabel: string
  variant?: "thinking" | "tool" | "result"
  children: React.ReactNode
  defaultOpen?: boolean
}

export function DisclosureBlock({
  label,
  expandedLabel,
  variant = "thinking",
  children,
  defaultOpen = false,
}: DisclosureBlockProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  const variantStyles = {
    thinking: "border-amber-500/15 bg-amber-500/[0.03]",
    tool: "border-blue-500/15 bg-blue-500/[0.03]",
    result: "border-green-500/15 bg-green-500/[0.03]",
  }

  const iconStyles = {
    thinking: "text-amber-600/70 dark:text-amber-400/70",
    tool: "text-blue-600/70 dark:text-blue-400/70",
    result: "text-green-600/70 dark:text-green-400/70",
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex items-center gap-1 text-xs text-muted-foreground/80",
          "hover:text-foreground/80 transition-colors",
          "group"
        )}
      >
        {isOpen ? (
          <ChevronDown className={cn("h-3 w-3", iconStyles[variant])} />
        ) : (
          <ChevronRight className={cn("h-3 w-3", iconStyles[variant])} />
        )}
        <span>{isOpen ? expandedLabel : label}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div
          className={cn(
            "mt-1.5 rounded border p-2",
            variantStyles[variant]
          )}
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
