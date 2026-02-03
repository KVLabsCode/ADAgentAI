import * as React from "react"
import { cn } from "@/lib/utils"

interface TreeLineProps {
  isLast: boolean
  hasChildren?: boolean
  isExpanded?: boolean
}

/**
 * Tree connector line component for visual hierarchy.
 * Wrapped in React.memo to prevent unnecessary re-renders.
 */
export const TreeLine = React.memo(function TreeLine({
  isLast,
  hasChildren: _hasChildren,
  isExpanded: _isExpanded,
}: TreeLineProps) {
  return (
    <div className="relative w-5 h-full flex items-center justify-center">
      {/* Vertical line */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-px bg-border/50",
          isLast ? "top-0 h-1/2" : "top-0 bottom-0"
        )}
      />
      {/* Horizontal line */}
      <div className="absolute left-1/2 w-1/2 h-px bg-border/50" />
    </div>
  )
})
