"use client"

import * as React from "react"
import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { useDemo } from "@/contexts/demo-mode-context"
import { PageContainer, PageHeader, LoadingSpinner } from "@/organisms/theme"
import { Button } from "@/atoms/button"
import { useExperimentDetail } from "@/components/experiments/hooks"
import { SideBySideReport } from "@/components/experiments/reports"
import { RecommendationList } from "@/components/experiments/recommendations"
import { ExecutionModal } from "@/components/experiments/execution"
import type { Recommendation, ExecutionScope } from "@/lib/experiments"

function DemoModeRequired() {
  return (
    <PageContainer>
      <PageHeader title="Experiment" />
      <div className="rounded-[var(--card-radius)] border-[0.8px] border-warning/30 bg-warning/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[length:var(--text-label)] font-[var(--font-weight-medium)] text-warning mb-1">
              Demo Mode Required
            </h3>
            <p className="text-[length:var(--text-description)] text-muted-foreground mb-4">
              Enable demo mode in Settings to view experiment results.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/settings")}
            >
              Go to Settings
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

function NotFound() {
  const router = useRouter()

  return (
    <PageContainer>
      <PageHeader title="Experiment Not Found" />
      <div className="rounded-[var(--card-radius)] border-[0.8px] border-[color:var(--card-border)] bg-[var(--card-bg)] p-6 text-center">
        <p className="text-muted-foreground mb-4">
          The experiment you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button onClick={() => router.push("/experiments")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Experiments
        </Button>
      </div>
    </PageContainer>
  )
}

export default function ExperimentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isDemoMode } = useDemo()
  const experimentId = params.id as string

  const { experiment, metrics, recommendations, isLoading } =
    useExperimentDetail(experimentId)

  // Execution modal state
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<Recommendation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [executedRecs, setExecutedRecs] = useState<Set<string>>(new Set())

  // Gate: require demo mode
  if (!isDemoMode) {
    return <DemoModeRequired />
  }

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSpinner label="Loading experiment..." />
      </PageContainer>
    )
  }

  if (!experiment || !metrics) {
    return <NotFound />
  }

  const handleExecuteClick = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation)
    setIsModalOpen(true)
  }

  const handleExecuteConfirm = (
    recommendation: Recommendation,
    _scope: ExecutionScope
  ) => {
    // Mark as executed
    setExecutedRecs((prev) => new Set(prev).add(recommendation.id))
  }

  // Update recommendations with executed status
  const updatedRecommendations = recommendations.map((rec) => ({
    ...rec,
    status: executedRecs.has(rec.id) ? ("executed" as const) : rec.status,
  }))

  return (
    <PageContainer>
      <PageHeader
        title={experiment.name}
        description="Experiment results and recommendations"
      >
        <Button variant="ghost" onClick={() => router.push("/experiments")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {/* Report */}
      <SideBySideReport experiment={experiment} metrics={metrics} />

      {/* Recommendations */}
      {experiment.status === "completed" && (
        <div className="mt-8">
          <RecommendationList
            recommendations={updatedRecommendations}
            onExecute={handleExecuteClick}
          />
        </div>
      )}

      {/* Execution Modal */}
      <ExecutionModal
        recommendation={selectedRecommendation}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onExecute={handleExecuteConfirm}
      />
    </PageContainer>
  )
}
