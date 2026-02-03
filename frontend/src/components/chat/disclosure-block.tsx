"use client"

import * as React from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/molecules/collapsible"
import { cn } from "@/lib/utils"

interface DisclosureBlockProps {
  label: string
  expandedLabel: string
  /** Variant for future styling differentiation. Currently all variants use same style. */
  variant?: "thinking" | "tool" | "result"
  children: React.ReactNode
  defaultOpen?: boolean
}

// Shared styles - all variants currently identical, extracted for easy future customization
const CONTENT_STYLES = "border-border/40 bg-muted/30"
const ICON_STYLES = "text-muted-foreground"

/**
 * Collapsible disclosure block with label that changes when expanded.
 * Memoized to prevent re-renders when parent state changes.
 */
export const DisclosureBlock = React.memo(function DisclosureBlock({
  label,
  expandedLabel,
  variant: _variant = "thinking",
  children,
  defaultOpen = false,
}: DisclosureBlockProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  const ChevronIcon = isOpen ? ChevronDown : ChevronRight
  const displayLabel = isOpen ? expandedLabel : label

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex items-center gap-1 text-xs text-muted-foreground/80",
          "hover:text-foreground/80 transition-colors",
          "group"
        )}
      >
        <ChevronIcon className={cn("h-3 w-3", ICON_STYLES)} />
        <span>{displayLabel}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className={cn("mt-1.5 rounded border p-2", CONTENT_STYLES)}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})
