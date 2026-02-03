"use client"

import { useMemo } from "react"
import { useDemo } from "@/contexts/demo-mode-context"
import { useDemoExperiments } from "@/contexts/demo-experiments-context"
import {
  getDemoExperiments,
  getDemoExperimentWithData,
  generateExperimentMetrics,
  generateRecommendations,
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
 * Merges static demo experiments with chat-created experiments
 */
export function useExperimentData(): UseExperimentDataResult {
  const { isDemoMode } = useDemo()
  const { experiments: chatExperiments } = useDemoExperiments()

  const experiments = useMemo(() => {
    if (!isDemoMode) return []

    // Get static demo experiments
    const staticExperiments = getDemoExperiments()

    // Merge: static experiments + chat-created (avoiding duplicates by ID)
    const staticIds = new Set(staticExperiments.map(e => e.id))
    const uniqueChatExperiments = chatExperiments.filter(e => !staticIds.has(e.id))

    return [...staticExperiments, ...uniqueChatExperiments]
  }, [isDemoMode, chatExperiments])

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
 * Supports both static demo experiments and chat-created experiments
 */
export function useExperimentDetail(id: string): UseExperimentDetailResult {
  const { isDemoMode } = useDemo()
  const { experiments: chatExperiments } = useDemoExperiments()

  const data = useMemo(() => {
    if (!isDemoMode || !id) return null

    // First try to get from static demo data
    const staticData = getDemoExperimentWithData(id)
    if (staticData) return staticData

    // Then check chat-created experiments
    const chatExperiment = chatExperiments.find(e => e.id === id)
    if (chatExperiment) {
      // Generate metrics for chat-created experiment
      const metrics = generateExperimentMetrics(chatExperiment)
      const recommendations = generateRecommendations(chatExperiment, metrics)
      return { experiment: chatExperiment, metrics, recommendations }
    }

    return null
  }, [isDemoMode, id, chatExperiments])

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
