"use client"

import { TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ImpactPreview as ImpactPreviewType } from "@/lib/experiments"

interface ImpactPreviewProps {
  impact: ImpactPreviewType
  className?: string
}

const CONFIDENCE_STYLES = {
  high: {
    icon: CheckCircle2,
    label: "High Confidence",
    className: "text-success",
  },
  medium: {
    icon: AlertCircle,
    label: "Medium Confidence",
    className: "text-warning",
  },
  low: {
    icon: AlertCircle,
    label: "Low Confidence",
    className: "text-muted-foreground",
  },
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value)
  if (absValue >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${value.toLocaleString()}`
}

export function ImpactPreview({ impact, className }: ImpactPreviewProps) {
  const confidence = CONFIDENCE_STYLES[impact.confidence]
  const ConfidenceIcon = confidence.icon
  const isPositive = impact.revenueChange > 0

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Revenue Impact */}
      <div className="flex items-center gap-2">
        <TrendingUp
          className={cn(
            "h-4 w-4",
            isPositive ? "text-success" : "text-destructive"
          )}
        />
        <div>
          <span
            className={cn(
              "font-semibold tabular-nums",
              isPositive ? "text-success" : "text-destructive"
            )}
          >
            {isPositive ? "+" : ""}
            {formatCurrency(impact.revenueChange)}/{impact.timeframe.slice(0, 2)}
          </span>
          <span className="text-muted-foreground text-xs ml-1">
            ({isPositive ? "+" : ""}
            {impact.revenueChangePercent.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Confidence */}
      <div className={cn("flex items-center gap-1", confidence.className)}>
        <ConfidenceIcon className="h-3.5 w-3.5" />
        <span className="text-xs">{confidence.label}</span>
      </div>
    </div>
  )
}
