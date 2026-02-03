"use client"

import { useMemo } from "react"
import { useDemo } from "@/contexts/demo-mode-context"
import {
  getDemoExperiments,
  getDemoExperimentWithData,
  type Experiment,
  type ExperimentMetrics,
  type Recommendation,
} from "@/lib/experiments"

interface UseExperimentDataResult {
  experiments: Experiment[]
  isLoading: boolean
  error: string | null
}

/**
 * Hook to fetch all experiments (demo data when in demo mode)
 */
export function useExperimentData(): UseExperimentDataResult {
  const { isDemoMode } = useDemo()

  const experiments = useMemo(() => {
    if (!isDemoMode) return []
    return getDemoExperiments()
  }, [isDemoMode])

  return {
    experiments,
    isLoading: false,
    error: isDemoMode ? null : "Demo mode required for experiments",
  }
}

interface UseExperimentDetailResult {
  experiment: Experiment | null
  metrics: ExperimentMetrics | null
  recommendations: Recommendation[]
  isLoading: boolean
  error: string | null
}

/**
 * Hook to fetch a single experiment with metrics and recommendations
 */
export function useExperimentDetail(id: string): UseExperimentDetailResult {
  const { isDemoMode } = useDemo()

  const data = useMemo(() => {
    if (!isDemoMode || !id) return null
    return getDemoExperimentWithData(id)
  }, [isDemoMode, id])

  return {
    experiment: data?.experiment ?? null,
    metrics: data?.metrics ?? null,
    recommendations: data?.recommendations ?? [],
    isLoading: false,
    error: isDemoMode
      ? data
        ? null
        : "Experiment not found"
      : "Demo mode required for experiments",
  }
}

/**
 * Filter experiments by status
 */
export function filterExperimentsByStatus(
  experiments: Experiment[],
  status: "all" | "running" | "completed" | "draft"
): Experiment[] {
  if (status === "all") return experiments
  return experiments.filter((exp) => exp.status === status)
}
