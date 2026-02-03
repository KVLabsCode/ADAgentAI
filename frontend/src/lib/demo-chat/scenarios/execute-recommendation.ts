/**
 * Execute Recommendation scenario handler
 */

import type { StreamEventItem } from "@/lib/types"
import type { ScenarioContext, ScenarioResult } from "../types"
import type { Experiment } from "@/lib/experiments/types"
import { generateExperimentMetrics, generateRecommendations } from "@/lib/experiments/demo-data"
import { NETWORK_PROVIDERS } from "@/lib/experiments/constants"

/**
 * Find experiment with a pending recommendation
 */
function findExperimentWithRecommendation(context: ScenarioContext): {
  experiment: Experiment
  recommendation: ReturnType<typeof generateRecommendations>[0]
} | null {
  const { experiments } = context

  // Prefer completed experiments (they have recommendations)
  const candidates = experiments.filter(e => e.status === "completed")

  for (const experiment of candidates) {
    const metrics = generateExperimentMetrics(experiment)
    const recommendations = generateRecommendations(experiment, metrics)

    if (recommendations.length > 0) {
      return {
        experiment,
        recommendation: recommendations[0],
      }
    }
  }

  // Also check running experiments
  const runningCandidates = experiments.filter(e => e.status === "running")
  for (const experiment of runningCandidates) {
    const metrics = generateExperimentMetrics(experiment)
    const recommendations = generateRecommendations({
      ...experiment,
      status: "completed", // Simulate completed to generate recommendations
    }, metrics)

    if (recommendations.length > 0) {
      return {
        experiment,
        recommendation: recommendations[0],
      }
    }
  }

  return null
}

/**
 * Format currency
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Handle execute recommendation intent
 */
export function handleExecuteRecommendation(context: ScenarioContext): ScenarioResult {
  const result = findExperimentWithRecommendation(context)

  if (!result) {
    return {
      events: [
        {
          type: "routing",
          service: "experiments",
          capability: "execute_recommendation",
        },
        {
          type: "result",
          content: "I don't see any pending recommendations to execute. Would you like me to analyze an experiment first? Ask me \"which platform is performing better?\" to get insights and recommendations.",
        },
      ],
    }
  }

  const { experiment, recommendation } = result

  // Get winner arm details
  const metrics = generateExperimentMetrics(experiment)
  const winnerArm = metrics.byArm.find(a => a.isWinner)
  const winnerArmDetail = experiment.arms.find(a => a.id === winnerArm?.armId)
  const winnerNetwork = winnerArmDetail
    ? NETWORK_PROVIDERS[winnerArmDetail.networkProvider]?.displayName
    : "Winner"

  // Build stream events
  const events: StreamEventItem[] = [
    {
      type: "routing",
      service: "experiments",
      capability: "execute_recommendation",
      thinking: "Processing recommendation execution request...",
    },
    {
      type: "thinking",
      content: `Preparing to execute: ${recommendation.title}. This will shift traffic allocation based on experiment results.`,
    },
    {
      type: "tool",
      name: "execute_recommendation",
      params: {
        experimentId: experiment.id,
        recommendationId: recommendation.id,
        action: recommendation.type,
        targetArm: recommendation.targetArmId,
        scope: recommendation.scope,
      },
    },
    {
      type: "tool_result",
      name: "execute_recommendation",
      result: {
        success: true,
        message: "Recommendation executed successfully",
        changes: {
          trafficShift: `100% to ${winnerNetwork}`,
          affectedCountries: recommendation.scope.countries,
          affectedFormats: recommendation.scope.formats,
        },
      },
    },
    {
      type: "result",
      content: buildExecutionMessage(experiment, recommendation, winnerNetwork),
    },
  ]

  // Update experiment status to reflect execution
  return {
    events,
    sideEffects: {
      updateExperiment: {
        id: experiment.id,
        updates: {
          status: "completed",
          endDate: new Date().toISOString().split("T")[0],
        },
      },
    },
  }
}

/**
 * Build the execution result message
 */
function buildExecutionMessage(
  experiment: Experiment,
  recommendation: ReturnType<typeof generateRecommendations>[0],
  winnerNetwork: string
): string {
  return `## Recommendation Executed Successfully

I've applied the recommendation from **${experiment.name}**.

### Changes Applied
- **Action**: ${recommendation.title}
- **Traffic shifted to**: ${winnerNetwork} (100%)
- **Affected countries**: ${recommendation.scope.countries.join(", ")}
- **Affected formats**: ${recommendation.scope.formats.join(", ")}

### Projected Impact
- **Revenue increase**: +${formatCurrency(recommendation.impactPreview.revenueChange)}/month
- **Confidence**: ${recommendation.impactPreview.confidence}

The configuration changes are now live. Monitor your revenue dashboard over the next few days to see the impact.

If needed, you can say "rollback" or "undo" to revert to the previous configuration.`
}
