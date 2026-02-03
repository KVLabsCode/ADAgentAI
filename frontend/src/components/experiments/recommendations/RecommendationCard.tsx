"use client"

import { Zap, ChevronRight, Check } from "lucide-react"
import { Button } from "@/atoms/button"
import { cn } from "@/lib/utils"
import type { Recommendation } from "@/lib/experiments"
import { ImpactPreview } from "./ImpactPreview"

interface RecommendationCardProps {
  recommendation: Recommendation
  onExecute: (recommendation: Recommendation) => void
  className?: string
}

const TYPE_ICONS = {
  shift_traffic: Zap,
  pause_arm: Zap,
  extend_experiment: Zap,
  apply_winner: Zap,
}

export function RecommendationCard({
  recommendation,
  onExecute,
  className,
}: RecommendationCardProps) {
  const isExecuted = recommendation.status === "executed"
  const Icon = TYPE_ICONS[recommendation.type]

  const handleExecute = () => {
    onExecute(recommendation)
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-[var(--card-bg)] p-4",
        isExecuted && "opacity-60",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-accent/10 text-accent shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)] mb-1">
            {recommendation.title}
          </h4>
          <p className="text-[length:var(--text-description)] text-muted-foreground">
            {recommendation.rationale}
          </p>
        </div>
      </div>

      {/* Impact Preview */}
      <div className="mb-4 py-3 border-y border-border/30">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
          Estimated Impact
        </p>
        <ImpactPreview impact={recommendation.impactPreview} />
      </div>

      {/* Action */}
      <div className="flex items-center justify-end">
        {isExecuted ? (
          <div className="flex items-center gap-1.5 text-success text-sm">
            <Check className="h-4 w-4" />
            Executed
          </div>
        ) : (
          <Button onClick={handleExecute} size="sm">
            Execute
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
