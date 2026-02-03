"use client"

import { Calendar, Clock, Users } from "lucide-react"
import { Badge } from "@/atoms/badge"
import { cn } from "@/lib/utils"
import {
  NETWORK_PROVIDERS,
  type Experiment,
  type ExperimentMetrics,
  type ArmMetrics,
} from "@/lib/experiments"
import { MetricCard } from "./MetricCard"
import { WinnerIndicator } from "./WinnerIndicator"
import { NetworkBreakdown } from "./NetworkBreakdown"
import { ReportCharts } from "./ReportCharts"

interface SideBySideReportProps {
  experiment: Experiment
  metrics: ExperimentMetrics
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 3 : 0,
  }).format(value)
}

function ArmColumn({
  arm,
  armMetrics,
  isBaseline,
}: {
  arm: Experiment["arms"][0]
  armMetrics: ArmMetrics
  isBaseline: boolean
}) {
  const network = NETWORK_PROVIDERS[arm.networkProvider]

  return (
    <div
      className={cn(
        "flex-1 rounded-lg border p-4",
        armMetrics.isWinner
          ? "border-success/50 bg-success/5"
          : "border-border/50 bg-muted/10"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: network.color }}
          />
          <span className="font-[var(--font-weight-medium)]">{arm.name}</span>
          <span className="text-[length:var(--text-description)] text-muted-foreground">
            ({network.displayName})
          </span>
        </div>
        <WinnerIndicator isWinner={armMetrics.isWinner} />
      </div>

      {/* Traffic */}
      <div className="flex items-center gap-1.5 mb-4 text-[length:var(--text-description)] text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        {arm.trafficPercentage}% traffic
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="ARPDAU"
          value={formatCurrency(armMetrics.arpdau)}
          isHighlighted={armMetrics.isWinner}
        />
        <MetricCard
          label="eCPM"
          value={formatCurrency(armMetrics.ecpm)}
        />
        <MetricCard
          label="IMDAU"
          value={armMetrics.imdau.toFixed(1)}
        />
        <MetricCard
          label="Fill Rate"
          value={`${armMetrics.fillRate.toFixed(1)}%`}
        />
        <MetricCard
          label="Revenue"
          value={formatCurrency(armMetrics.revenue)}
          delta={isBaseline ? undefined : armMetrics.revenueDelta}
          isHighlighted={armMetrics.isWinner}
          className="col-span-2"
        />
      </div>
    </div>
  )
}

export function SideBySideReport({ experiment, metrics }: SideBySideReportProps) {
  const STATUS_STYLES = {
    completed: { label: "Completed", className: "bg-success/10 text-success border-success/30" },
    running: { label: "Running", className: "bg-accent/10 text-accent border-accent/30" },
    draft: { label: "Draft", className: "bg-muted text-muted-foreground border-muted" },
    paused: { label: "Paused", className: "bg-warning/10 text-warning border-warning/30" },
  }

  const status = STATUS_STYLES[experiment.status]

  return (
    <div className="space-y-6">
      {/* Experiment Header */}
      <div className="rounded-[var(--card-radius)] border-[0.8px] border-[color:var(--card-border)] bg-[var(--card-bg)] p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold">{experiment.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-[length:var(--text-description)] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {experiment.durationDays} days
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(experiment.startDate)}
                {experiment.endDate && ` - ${formatDate(experiment.endDate)}`}
              </span>
            </div>
          </div>
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Total Revenue
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {formatCurrency(metrics.overall.totalRevenue)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Avg ARPDAU
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {formatCurrency(metrics.overall.avgArpdau)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Avg eCPM
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {formatCurrency(metrics.overall.avgEcpm)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Impressions
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {metrics.overall.totalImpressions.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Arms */}
      <div className="flex flex-col sm:flex-row gap-4">
        {experiment.arms.map((arm, index) => {
          const armMetrics = metrics.byArm.find((m) => m.armId === arm.id)
          if (!armMetrics) return null

          return (
            <ArmColumn
              key={arm.id}
              arm={arm}
              armMetrics={armMetrics}
              isBaseline={index === 0}
            />
          )
        })}
      </div>

      {/* Charts */}
      <ReportCharts
        timeSeries={metrics.timeSeries}
        experiment={experiment}
        metric="arpdau"
      />

      {/* Network Breakdown */}
      <NetworkBreakdown
        breakdown={metrics.networkBreakdown}
        experiment={experiment}
      />
    </div>
  )
}
