"use client"

import * as React from "react"
import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subValue?: string
  icon?: React.ElementType
  /** Trend text (e.g., "+12% this week") */
  change?: string
  /** Trend direction for coloring */
  changeType?: "positive" | "negative" | "neutral"
  /** Value text color */
  valueColor?: "default" | "success" | "warning" | "error"
  href?: string
  className?: string
}

const VALUE_COLORS = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
}

function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  change,
  changeType = "neutral",
  valueColor = "default",
  href,
  className,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border border-border/40 bg-card/50",
        "transition-colors duration-150",
        href && "hover:bg-card hover:border-border/60 cursor-pointer",
        className
      )}
    >
      {Icon && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={cn("text-lg font-semibold tabular-nums leading-none", VALUE_COLORS[valueColor])}>{value}</p>
          {change && (
            <span
              className={cn(
                "text-[10px] flex items-center gap-0.5",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {changeType === "positive" && <TrendingUp className="h-2.5 w-2.5" />}
              {change}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{subValue || title}</p>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

export { StatCard, type StatCardProps }
