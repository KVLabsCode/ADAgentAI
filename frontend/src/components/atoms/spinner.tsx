import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the spinner icon */
  size?: "xs" | "sm" | "md" | "lg"
}

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const

/**
 * Hardware-accelerated spinner component.
 *
 * Wraps Loader2 in a div so the animation runs on the GPU (transform)
 * rather than the CPU (SVG element animation).
 *
 * @example
 * <Spinner size="sm" className="text-muted-foreground" />
 * <Spinner size="md" className="mr-2" />
 */
export function Spinner({ size = "sm", className, ...props }: SpinnerProps) {
  return (
    <div className={cn("animate-spin", className)} {...props}>
      <Loader2 className={sizeClasses[size]} />
    </div>
  )
}
