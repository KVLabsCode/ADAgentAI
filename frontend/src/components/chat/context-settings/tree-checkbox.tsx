import * as React from "react"
import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface TreeCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onCheckedChange: () => void
  className?: string
}

/**
 * Custom checkbox with indeterminate state support for tree views.
 * Wrapped in React.memo to prevent unnecessary re-renders.
 */
export const TreeCheckbox = React.memo(function TreeCheckbox({
  checked,
  indeterminate,
  onCheckedChange,
  className,
}: TreeCheckboxProps) {
  return (
    <button
      onClick={onCheckedChange}
      className={cn(
        "h-4 w-4 shrink-0 rounded border transition-colors duration-150",
        "flex items-center justify-center",
        checked || indeterminate
          ? "bg-primary border-primary text-primary-foreground"
          : "border-muted-foreground/30 hover:border-muted-foreground/50 bg-background",
        className
      )}
    >
      {indeterminate ? (
        <Minus className="h-3 w-3" strokeWidth={3} />
      ) : checked ? (
        <Check className="h-3 w-3" strokeWidth={3} />
      ) : null}
    </button>
  )
})
