"use client"

import * as React from "react"
import Link from "next/link"
import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subValue?: string
  icon?: React.ElementType
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  href?: string
  className?: string
}

function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  trendValue,
  href,
  className,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        "rounded border border-border/50 bg-card p-4",
        "transition-colors duration-200",
        href && "hover:border-foreground/20 cursor-pointer group",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="font-mono text-xl font-bold text-foreground">{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground font-mono">{subValue}</p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "rounded-lg p-2 bg-muted",
            href && "group-hover:bg-muted/80 transition-colors"
          )}>
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {trend === "up" ? (
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          ) : trend === "down" ? (
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          ) : null}
          <span
            className={cn(
              "font-mono",
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trendValue}
          </span>
          <span className="text-muted-foreground">vs last period</span>
        </div>
      )}

      {href && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

export { StatCard, type StatCardProps }
