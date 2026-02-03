/**
 * Get Insights scenario handler
 */

import type { StreamEventItem } from "@/lib/types"
import type { ScenarioContext, ScenarioResult } from "../types"
import type { Experiment, ExperimentMetrics } from "@/lib/experiments/types"
import { generateExperimentMetrics, generateRecommendations } from "@/lib/experiments/demo-data"
import { NETWORK_PROVIDERS } from "@/lib/experiments/constants"

/**
 * Find the most relevant experiment for the query
 */
function findRelevantExperiment(context: ScenarioContext): Experiment | null {
  const { experiments, entities } = context

  // If a specific experiment ID is mentioned, use that
  if (entities?.experimentId) {
    return experiments.find(e => e.id === entities.experimentId) || null
  }

  // If specific platforms are mentioned, find a matching experiment
  if (entities?.platforms && entities.platforms.length > 0) {
    const matchingExp = experiments.find(exp =>
      exp.arms.some(arm =>
        entities!.platforms!.includes(arm.networkProvider)
      )
    )
    if (matchingExp) return matchingExp
  }

  // Prefer running experiments, then completed
  const runningExps = experiments.filter(e => e.status === "running")
  if (runningExps.length > 0) return runningExps[0]

  const completedExps = experiments.filter(e => e.status === "completed")
  if (completedExps.length > 0) return completedExps[0]

  return experiments[0] || null
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
 * Format number with suffix (K, M)
 */
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

/**
 * Handle get insights intent
 */
export function handleGetInsights(context: ScenarioContext): ScenarioResult {
  const experiment = findRelevantExperiment(context)

  if (!experiment) {
    return {
      events: [
        {
          type: "routing",
          service: "experiments",
          capability: "get_insights",
        },
        {
          type: "result",
          content: "I don't see any experiments to analyze. Would you like to create a new A/B test? Just tell me something like \"Create an experiment comparing AdMob and MAX with 50/50 traffic split.\"",
        },
      ],
    }
  }

  // Generate metrics for the experiment
  const metrics = generateExperimentMetrics(experiment)
  const recommendations = generateRecommendations(experiment, metrics)

  // Find the winning arm
  const winnerArm = metrics.byArm.find(a => a.isWinner)
  const loserArm = metrics.byArm.find(a => !a.isWinner)

  // Get arm details
  const winnerArmDetail = experiment.arms.find(a => a.id === winnerArm?.armId)
  const loserArmDetail = experiment.arms.find(a => a.id === loserArm?.armId)

  const winnerName = winnerArmDetail
    ? NETWORK_PROVIDERS[winnerArmDetail.networkProvider]?.displayName || winnerArmDetail.networkProvider
    : "Unknown"
  const loserName = loserArmDetail
    ? NETWORK_PROVIDERS[loserArmDetail.networkProvider]?.displayName || loserArmDetail.networkProvider
    : "Unknown"

  // Build stream events
  const events: StreamEventItem[] = [
    {
      type: "routing",
      service: "experiments",
      capability: "analyze_results",
      thinking: "Retrieving experiment data and calculating performance metrics...",
    },
    {
      type: "thinking",
      content: `Analyzing ${experiment.name}... Comparing ${experiment.arms.length} arms across ${metrics.overall.totalImpressions.toLocaleString()} impressions.`,
    },
    {
      type: "tool",
      name: "get_experiment_metrics",
      params: {
        experimentId: experiment.id,
        metrics: ["arpdau", "ecpm", "revenue", "fill_rate", "impressions"],
      },
    },
    {
      type: "tool_result",
      name: "get_experiment_metrics",
      result: {
        experimentId: experiment.id,
        status: experiment.status,
        totalRevenue: metrics.overall.totalRevenue,
        totalImpressions: metrics.overall.totalImpressions,
        byArm: metrics.byArm.map(arm => ({
          armId: arm.armId,
          arpdau: arm.arpdau,
          ecpm: arm.ecpm,
          revenue: arm.revenue,
          isWinner: arm.isWinner,
        })),
      },
    },
    {
      type: "result",
      content: buildInsightsMessage(experiment, metrics, recommendations, winnerName, loserName),
    },
  ]

  return { events }
}

/**
 * Build the insights result message
 */
function buildInsightsMessage(
  experiment: Experiment,
  metrics: ExperimentMetrics,
  recommendations: ReturnType<typeof generateRecommendations>,
  winnerName: string,
  loserName: string
): string {
  const winnerArm = metrics.byArm.find(a => a.isWinner)!
  const loserArm = metrics.byArm.find(a => !a.isWinner)!

  const revenueDiff = winnerArm.revenue - loserArm.revenue
  const arpdauDiff = ((winnerArm.arpdau - loserArm.arpdau) / loserArm.arpdau * 100).toFixed(1)

  const statusBadge = experiment.status === "running" ? " (Running)" : " (Completed)"

  let message = `## ${experiment.name}${statusBadge}

### Winner: **${winnerName}**

**${winnerName}** is outperforming **${loserName}** with **+${arpdauDiff}% higher ARPDAU**.

### Performance Comparison

| Metric | ${winnerName} | ${loserName} |
|--------|--------------|--------------|
| ARPDAU | **$${winnerArm.arpdau.toFixed(3)}** | $${loserArm.arpdau.toFixed(3)} |
| eCPM | **$${winnerArm.ecpm.toFixed(2)}** | $${loserArm.ecpm.toFixed(2)} |
| Revenue | **${formatCurrency(winnerArm.revenue)}** | ${formatCurrency(loserArm.revenue)} |
| Fill Rate | ${winnerArm.fillRate.toFixed(1)}% | ${loserArm.fillRate.toFixed(1)}% |
| Impressions | ${formatNumber(winnerArm.impressions)} | ${formatNumber(loserArm.impressions)} |

### Summary
- **Total Revenue**: ${formatCurrency(metrics.overall.totalRevenue)}
- **Total Impressions**: ${formatNumber(metrics.overall.totalImpressions)}
- **Revenue Difference**: +${formatCurrency(revenueDiff)} for ${winnerName}`

  // Add recommendations if available
  if (recommendations.length > 0) {
    const topRec = recommendations[0]
    message += `

### Recommendation
${topRec.title}

${topRec.rationale}

**Projected Impact**: +${formatCurrency(topRec.impactPreview.revenueChange)}/month (${topRec.impactPreview.confidence} confidence)

Would you like me to execute this recommendation? Just say "execute" or "apply the recommendation".`
  }

  return message
}
