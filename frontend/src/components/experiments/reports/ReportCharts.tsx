"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { TimeSeriesPoint, Experiment } from "@/lib/experiments"
import { NETWORK_PROVIDERS } from "@/lib/experiments"

interface ReportChartsProps {
  timeSeries: TimeSeriesPoint[]
  experiment: Experiment
  metric?: "arpdau" | "ecpm" | "revenue"
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function formatMetricValue(value: number, metric: string): string {
  if (metric === "arpdau") return `$${value.toFixed(3)}`
  if (metric === "ecpm") return `$${value.toFixed(2)}`
  if (metric === "revenue") return `$${value.toLocaleString()}`
  return value.toString()
}

const METRIC_LABELS = {
  arpdau: "ARPDAU",
  ecpm: "eCPM",
  revenue: "Daily Revenue",
}

export function ReportCharts({
  timeSeries,
  experiment,
  metric = "arpdau",
}: ReportChartsProps) {
  // Transform data for recharts - group by date with arm values as columns
  const dates = [...new Set(timeSeries.map((p) => p.date))].sort()
  const chartData = dates.map((date) => {
    const dataPoint: Record<string, string | number> = { date: formatDate(date) }
    experiment.arms.forEach((arm) => {
      const point = timeSeries.find(
        (p) => p.date === date && p.armId === arm.id
      )
      if (point) {
        dataPoint[arm.id] = point[metric]
      }
    })
    return dataPoint
  })

  return (
    <div className="rounded-[var(--card-radius)] border-[0.8px] border-[color:var(--card-border)] bg-[var(--card-bg)] p-4">
      <h3 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)] mb-4">
        {METRIC_LABELS[metric]} Over Time
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tickFormatter={(value) => formatMetricValue(value, metric)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--card-radius)",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value) =>
                value !== undefined
                  ? [formatMetricValue(value as number, metric), ""]
                  : ["", ""]
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => {
                const arm = experiment.arms.find((a) => a.id === value)
                if (!arm) return value
                return `${arm.name} (${NETWORK_PROVIDERS[arm.networkProvider].displayName})`
              }}
            />
            {experiment.arms.map((arm) => (
              <Line
                key={arm.id}
                type="monotone"
                dataKey={arm.id}
                stroke={NETWORK_PROVIDERS[arm.networkProvider].color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
