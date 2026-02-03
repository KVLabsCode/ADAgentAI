"use client"

import { Lightbulb } from "lucide-react"
import { EmptyState } from "@/organisms/theme"
import type { Recommendation } from "@/lib/experiments"
import { RecommendationCard } from "./RecommendationCard"

interface RecommendationListProps {
  recommendations: Recommendation[]
  onExecute: (recommendation: Recommendation) => void
}

export function RecommendationList({
  recommendations,
  onExecute,
}: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No recommendations yet"
        description="Recommendations will appear when the experiment completes."
        className="py-8"
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-accent" />
        <h3 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)]">
          Recommended Actions
        </h3>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onExecute={onExecute}
          />
        ))}
      </div>
    </div>
  )
}
