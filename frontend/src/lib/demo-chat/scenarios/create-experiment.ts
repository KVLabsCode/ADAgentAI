/**
 * Create Experiment scenario handler
 */

import type { StreamEventItem } from "@/lib/types"
import type { ScenarioContext, ScenarioResult } from "../types"
import type { Experiment, ExperimentArm } from "@/lib/experiments/types"
import { parseTrafficPrompt } from "@/lib/experiments/prompt-parser"
import { NETWORK_PROVIDERS } from "@/lib/experiments/constants"

/**
 * Generate a unique experiment ID
 */
function generateExperimentId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 5)
  return `exp-${timestamp}-${random}`
}

/**
 * Generate experiment name from parsed allocation
 */
function generateExperimentName(context: ScenarioContext): string {
  const platforms = context.entities?.platforms || ["admob", "max"]
  const platformNames = platforms.map(p =>
    NETWORK_PROVIDERS[p as keyof typeof NETWORK_PROVIDERS]?.displayName || p.toUpperCase()
  )

  const countries = context.entities?.countries || ["US"]

  if (platformNames.length >= 2) {
    return `${platformNames[0]} vs ${platformNames[1]} Test (${countries.join(", ")})`
  }

  return `A/B Test - ${platformNames.join(" vs ")} (${countries.join(", ")})`
}

/**
 * Format ISO date string
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Handle create experiment intent
 */
export function handleCreateExperiment(context: ScenarioContext): ScenarioResult {
  const { userInput } = context

  // Parse the user's prompt to extract allocation details
  const parsed = parseTrafficPrompt(userInput)

  // Generate experiment data
  const experimentId = generateExperimentId()
  const experimentName = generateExperimentName(context)
  const now = new Date()
  const startDate = formatDate(now)

  // Build arms from parsed allocation
  const arms: ExperimentArm[] = parsed.armAllocations.map((allocation, index) => ({
    id: `${experimentId}-arm-${index}`,
    name: `${NETWORK_PROVIDERS[allocation.networkProvider]?.displayName || allocation.networkProvider} Arm`,
    networkProvider: allocation.networkProvider,
    trafficPercentage: allocation.trafficPercentage,
    targeting: {
      countries: parsed.targeting.countries,
      tiers: parsed.targeting.tiers,
      platforms: ["ios", "android"],
      excludedFormats: parsed.targeting.excludedFormats,
    },
  }))

  // Create the experiment object
  const experiment: Experiment = {
    id: experimentId,
    name: experimentName,
    type: "cross_platform_ab",
    status: "running",
    arms,
    startDate,
    endDate: null,
    durationDays: parsed.durationDays,
    prompt: userInput,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  // Build allocation summary
  const allocationSummary = parsed.armAllocations
    .map(a => `${a.trafficPercentage}% to ${NETWORK_PROVIDERS[a.networkProvider]?.displayName || a.networkProvider}`)
    .join(", ")

  // Build stream events
  const events: StreamEventItem[] = [
    {
      type: "routing",
      service: "experiments",
      capability: "create_experiment",
      thinking: "Analyzing your experiment configuration request...",
    },
    {
      type: "thinking",
      content: `Parsing experiment configuration: ${allocationSummary} for ${parsed.targeting.countries.join(", ")} users. Duration: ${parsed.durationDays} days.`,
    },
    {
      type: "tool",
      name: "create_experiment",
      params: {
        name: experimentName,
        type: "cross_platform_ab",
        arms: arms.map(a => ({
          network: a.networkProvider,
          traffic: `${a.trafficPercentage}%`,
        })),
        targeting: {
          countries: parsed.targeting.countries,
          excludedFormats: parsed.targeting.excludedFormats,
        },
        duration: `${parsed.durationDays} days`,
      },
    },
    {
      type: "tool_result",
      name: "create_experiment",
      result: {
        success: true,
        experimentId,
        status: "running",
        message: `Experiment "${experimentName}" created successfully`,
      },
    },
    {
      type: "result",
      content: buildResultMessage(experiment, parsed),
    },
  ]

  return {
    events,
    sideEffects: {
      createExperiment: experiment,
    },
  }
}

/**
 * Build the final result message
 */
function buildResultMessage(
  experiment: Experiment,
  parsed: ReturnType<typeof parseTrafficPrompt>
): string {
  const allocationLines = experiment.arms
    .map(arm => `- **${arm.name}**: ${arm.trafficPercentage}% of traffic`)
    .join("\n")

  const excludedFormats = parsed.targeting.excludedFormats.length > 0
    ? `\n- **Excluded formats**: ${parsed.targeting.excludedFormats.join(", ")}`
    : ""

  return `I've created your A/B experiment: **${experiment.name}**

**Configuration:**
${allocationLines}
- **Target countries**: ${parsed.targeting.countries.join(", ")}${excludedFormats}
- **Duration**: ${parsed.durationDays} days

**Status**: Running

The experiment is now live and collecting data. You can check back in a few days to see early results, or ask me "which platform is performing better?" to get insights once data starts coming in.

You can also view this experiment in the [Experiments dashboard](/experiments/${experiment.id}).`
}
