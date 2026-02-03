"use client"

import Link from "next/link"
import { Calendar, Clock, ArrowRight } from "lucide-react"
import { Badge } from "@/atoms/badge"
import { cn } from "@/lib/utils"
import { type Experiment, NETWORK_PROVIDERS } from "@/lib/experiments"

interface ExperimentCardProps {
  experiment: Experiment
  className?: string
}

const STATUS_STYLES = {
  completed: { label: "Completed", variant: "success" as const },
  running: { label: "Running", variant: "default" as const },
  draft: { label: "Draft", variant: "secondary" as const },
  paused: { label: "Paused", variant: "warning" as const },
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ExperimentCard({ experiment, className }: ExperimentCardProps) {
  const status = STATUS_STYLES[experiment.status]
  const networks = experiment.arms
    .map((arm) => NETWORK_PROVIDERS[arm.networkProvider].displayName)
    .join(" vs ")

  return (
    <Link
      href={`/experiments/${experiment.id}`}
      className={cn(
        "group block rounded-[var(--card-radius)] border-[0.8px] border-[color:var(--card-border)] bg-[var(--card-bg)]",
        "px-[var(--item-padding-x)] py-[var(--item-padding-y)]",
        "hover:bg-muted/30 transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)] truncate">
            {experiment.name}
          </h3>
          <Badge
            variant={status.variant === "success" ? "default" : status.variant === "warning" ? "outline" : "secondary"}
            className={cn(
              "shrink-0",
              status.variant === "success" && "bg-success/10 text-success border-success/30",
              status.variant === "warning" && "bg-warning/10 text-warning border-warning/30"
            )}
          >
            {status.label}
          </Badge>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      <div className="flex items-center gap-4 text-[length:var(--text-description)] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-foreground/80">{networks}</span>
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {experiment.durationDays} days
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(experiment.startDate)}
        </span>
      </div>

      {experiment.arms.length > 0 && (
        <div className="flex items-center gap-2 mt-2">
          {experiment.arms.map((arm) => (
            <span
              key={arm.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-muted/50 text-muted-foreground"
            >
              {NETWORK_PROVIDERS[arm.networkProvider].displayName}:{" "}
              {arm.trafficPercentage}%
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
