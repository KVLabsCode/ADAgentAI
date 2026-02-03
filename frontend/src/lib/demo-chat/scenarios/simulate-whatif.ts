/**
 * What-If Simulation scenario handler
 */

import type { StreamEventItem } from "@/lib/types"
import type { ScenarioContext, ScenarioResult } from "../types"
import type { Experiment } from "@/lib/experiments/types"
import { generateExperimentMetrics } from "@/lib/experiments/demo-data"
import { NETWORK_PROVIDERS } from "@/lib/experiments/constants"

/**
 * Find the most relevant experiment for simulation
 */
function findRelevantExperiment(context: ScenarioContext): Experiment | null {
  const { experiments, entities } = context

  // Prefer experiments with the mentioned platforms
  if (entities?.platforms && entities.platforms.length > 0) {
    const matchingExp = experiments.find(exp =>
      exp.arms.some(arm =>
        entities!.platforms!.includes(arm.networkProvider)
      )
    )
    if (matchingExp) return matchingExp
  }

  // Prefer running experiments
  const runningExps = experiments.filter(e => e.status === "running")
  if (runningExps.length > 0) return runningExps[0]

  // Fall back to completed
  const completedExps = experiments.filter(e => e.status === "completed")
  if (completedExps.length > 0) return completedExps[0]

  return experiments[0] || null
}

/**
 * Parse what-if scenario from user input
 */
function parseWhatIfScenario(userInput: string, experiment: Experiment): {
  targetNetwork: string
  trafficChange: number
  direction: "increase" | "decrease"
} | null {
  const lower = userInput.toLowerCase()

  // Extract percentage change
  const percentMatch = lower.match(/(\d+)\s*%/)
  const percentage = percentMatch ? parseInt(percentMatch[1], 10) : 20

  // Determine direction
  const isIncrease = /increase|more|shift|move|add/.test(lower)
  const isDecrease = /decrease|less|reduce|remove/.test(lower)
  const direction: "increase" | "decrease" = isDecrease && !isIncrease ? "decrease" : "increase"

  // Find target network
  let targetNetwork = "admob" // default
  for (const arm of experiment.arms) {
    const networkName = NETWORK_PROVIDERS[arm.networkProvider]?.displayName.toLowerCase() || arm.networkProvider
    if (lower.includes(networkName) || lower.includes(arm.networkProvider)) {
      targetNetwork = arm.networkProvider
      break
    }
  }

  return {
    targetNetwork,
    trafficChange: percentage,
    direction,
  }
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
 * Handle simulate what-if intent
 */
export function handleSimulateWhatIf(context: ScenarioContext): ScenarioResult {
  const experiment = findRelevantExperiment(context)

  if (!experiment) {
    return {
      events: [
        {
          type: "routing",
          service: "experiments",
          capability: "simulate_impact",
        },
        {
          type: "result",
          content: "I need an existing experiment to run a simulation on. Would you like to create an A/B test first? Tell me something like \"Create an experiment comparing AdMob and MAX.\"",
        },
      ],
    }
  }

  const scenario = parseWhatIfScenario(context.userInput, experiment)
  if (!scenario) {
    return {
      events: [
        {
          type: "routing",
          service: "experiments",
          capability: "simulate_impact",
        },
        {
          type: "result",
          content: "I couldn't parse your simulation request. Try something like \"What if we shift 20% more traffic to AdMob?\" or \"Simulate increasing MAX traffic by 30%.\"",
        },
      ],
    }
  }

  const { targetNetwork, trafficChange, direction } = scenario
  const targetNetworkDisplay = NETWORK_PROVIDERS[targetNetwork as keyof typeof NETWORK_PROVIDERS]?.displayName || targetNetwork

  // Get current metrics
  const metrics = generateExperimentMetrics(experiment)
  const targetArm = experiment.arms.find(a => a.networkProvider === targetNetwork)
  const otherArm = experiment.arms.find(a => a.networkProvider !== targetNetwork)

  const targetArmMetrics = metrics.byArm.find(a => a.armId === targetArm?.id)
  const otherArmMetrics = metrics.byArm.find(a => a.armId === otherArm?.id)

  // Calculate projected impact
  const currentTraffic = targetArm?.trafficPercentage || 50
  const newTraffic = direction === "increase"
    ? Math.min(currentTraffic + trafficChange, 100)
    : Math.max(currentTraffic - trafficChange, 0)

  // Simple projection based on ARPDAU difference
  const targetArpdau = targetArmMetrics?.arpdau || 0.15
  const otherArpdau = otherArmMetrics?.arpdau || 0.12
  const arpdauDiff = targetArpdau - otherArpdau

  // Project monthly revenue change
  const avgDau = 100000 // Assume 100K DAU for projection
  const trafficShiftedDau = avgDau * (trafficChange / 100)
  const dailyRevenueChange = trafficShiftedDau * arpdauDiff * (direction === "increase" ? 1 : -1)
  const monthlyRevenueChange = dailyRevenueChange * 30

  // Build stream events
  const events: StreamEventItem[] = [
    {
      type: "routing",
      service: "experiments",
      capability: "simulate_impact",
      thinking: "Running what-if simulation based on current experiment data...",
    },
    {
      type: "thinking",
      content: `Simulating: ${direction === "increase" ? "Increase" : "Decrease"} ${targetNetworkDisplay} traffic by ${trafficChange}%. Analyzing impact on revenue and performance metrics.`,
    },
    {
      type: "tool",
      name: "simulate_traffic_change",
      params: {
        experimentId: experiment.id,
        targetNetwork,
        currentTraffic: `${currentTraffic}%`,
        newTraffic: `${newTraffic}%`,
        change: `${direction === "increase" ? "+" : "-"}${trafficChange}%`,
      },
    },
    {
      type: "tool_result",
      name: "simulate_traffic_change",
      result: {
        projection: {
          monthlyRevenueChange: monthlyRevenueChange,
          confidence: Math.abs(monthlyRevenueChange) > 5000 ? "high" : Math.abs(monthlyRevenueChange) > 1000 ? "medium" : "low",
          basedOn: `${experiment.durationDays} days of data`,
        },
      },
    },
    {
      type: "result",
      content: buildSimulationMessage(
        experiment,
        targetNetworkDisplay,
        currentTraffic,
        newTraffic,
        trafficChange,
        direction,
        monthlyRevenueChange,
        targetArpdau,
        otherArpdau
      ),
    },
  ]

  return { events }
}

/**
 * Build the simulation result message
 */
function buildSimulationMessage(
  experiment: Experiment,
  targetNetwork: string,
  currentTraffic: number,
  newTraffic: number,
  trafficChange: number,
  direction: "increase" | "decrease",
  monthlyRevenueChange: number,
  targetArpdau: number,
  otherArpdau: number
): string {
  const isPositive = monthlyRevenueChange > 0
  const changeIcon = isPositive ? "+" : ""
  const recommendation = isPositive
    ? `This change would likely **improve** your revenue. Consider applying this configuration.`
    : `This change would likely **decrease** your revenue. I recommend keeping the current allocation or shifting traffic the other direction.`

  return `## What-If Simulation Results

### Scenario
${direction === "increase" ? "Increasing" : "Decreasing"} **${targetNetwork}** traffic by ${trafficChange}%

### Traffic Allocation
| Network | Current | Projected |
|---------|---------|-----------|
| ${targetNetwork} | ${currentTraffic}% | **${newTraffic}%** |
| Other | ${100 - currentTraffic}% | ${100 - newTraffic}% |

### Projected Impact

**Monthly Revenue Change**: ${changeIcon}${formatCurrency(monthlyRevenueChange)}

This projection is based on:
- ${targetNetwork} ARPDAU: $${targetArpdau.toFixed(3)}
- Competitor ARPDAU: $${otherArpdau.toFixed(3)}
- ${experiment.durationDays} days of experiment data

### Recommendation
${recommendation}

Want me to apply this change? Say "execute" or "apply" to proceed.`
}
