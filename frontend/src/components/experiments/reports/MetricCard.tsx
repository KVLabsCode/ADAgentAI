"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  isHighlighted?: boolean
  className?: string
}

export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  isHighlighted,
  className,
}: MetricCardProps) {
  const hasDelta = delta !== undefined && delta !== 0
  const isPositive = delta !== undefined && delta > 0

  return (
    <div
      className={cn(
        "p-3 rounded-lg",
        isHighlighted
          ? "bg-success/10 border border-success/30"
          : "bg-muted/30",
        className
      )}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {hasDelta && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              isPositive ? "text-success" : "text-destructive"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>
      {deltaLabel && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{deltaLabel}</p>
      )}
    </div>
  )
}
