"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/molecules/table"
import type { NetworkBreakdownItem, Experiment } from "@/lib/experiments"

interface NetworkBreakdownProps {
  breakdown: NetworkBreakdownItem[]
  experiment: Experiment
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

export function NetworkBreakdown({ breakdown, experiment }: NetworkBreakdownProps) {
  // Map arm IDs to arm names
  const armNames = new Map(
    experiment.arms.map((arm) => [arm.id, arm.name])
  )

  return (
    <div className="rounded-[var(--card-radius)] border-[0.8px] border-[color:var(--card-border)] overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
        <h3 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)]">
          Network Breakdown
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Network</TableHead>
            <TableHead>Arm</TableHead>
            <TableHead className="text-right">eCPM</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Fill Rate</TableHead>
            <TableHead className="text-right">Impressions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {breakdown.map((item, index) => (
            <TableRow key={`${item.armId}-${index}`}>
              <TableCell className="font-medium">{item.network}</TableCell>
              <TableCell className="text-muted-foreground">
                {armNames.get(item.armId) || item.armId}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(item.ecpm)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(item.revenue)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {item.fillRate.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(item.impressions)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
