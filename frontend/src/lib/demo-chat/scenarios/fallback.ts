/**
 * Fallback and Help scenario handlers
 */

import type { StreamEventItem } from "@/lib/types"
import type { ScenarioContext, ScenarioResult } from "../types"

/**
 * Handle help intent
 */
export function handleHelp(_context: ScenarioContext): ScenarioResult {
  const events: StreamEventItem[] = [
    {
      type: "routing",
      service: "experiments",
      capability: "help",
    },
    {
      type: "result",
      content: HELP_MESSAGE,
    },
  ]

  return { events }
}

/**
 * Handle list experiments intent
 */
export function handleListExperiments(context: ScenarioContext): ScenarioResult {
  const { experiments } = context

  if (experiments.length === 0) {
    return {
      events: [
        {
          type: "routing",
          service: "experiments",
          capability: "list",
        },
        {
          type: "result",
          content: `You don't have any experiments yet. Would you like to create one?

Try: "Create an A/B test comparing AdMob and MAX with 50/50 traffic split for US users."`,
        },
      ],
    }
  }

  // Group experiments by status
  const running = experiments.filter(e => e.status === "running")
  const completed = experiments.filter(e => e.status === "completed")
  const draft = experiments.filter(e => e.status === "draft")

  let message = `## Your Experiments\n\n`

  if (running.length > 0) {
    message += `### Running (${running.length})\n`
    running.forEach(exp => {
      message += `- **${exp.name}** - ${exp.arms.map(a => `${a.trafficPercentage}% ${a.networkProvider}`).join(", ")}\n`
    })
    message += "\n"
  }

  if (completed.length > 0) {
    message += `### Completed (${completed.length})\n`
    completed.forEach(exp => {
      message += `- **${exp.name}** - ${exp.durationDays} days\n`
    })
    message += "\n"
  }

  if (draft.length > 0) {
    message += `### Drafts (${draft.length})\n`
    draft.forEach(exp => {
      message += `- **${exp.name}**\n`
    })
    message += "\n"
  }

  message += `\nAsk me "which is performing better?" to get insights on any experiment, or view them in the [Experiments dashboard](/experiments).`

  return {
    events: [
      {
        type: "routing",
        service: "experiments",
        capability: "list",
      },
      {
        type: "tool",
        name: "list_experiments",
        params: {
          status: "all",
        },
      },
      {
        type: "tool_result",
        name: "list_experiments",
        result: {
          total: experiments.length,
          running: running.length,
          completed: completed.length,
          draft: draft.length,
        },
      },
      {
        type: "result",
        content: message,
      },
    ],
  }
}

/**
 * Handle rollback intent
 */
export function handleRollback(context: ScenarioContext): ScenarioResult {
  const { experiments } = context

  // Find experiment that was recently "executed"
  const executedExp = experiments.find(e =>
    e.status === "completed" && e.updatedAt
  )

  if (!executedExp) {
    return {
      events: [
        {
          type: "routing",
          service: "experiments",
          capability: "rollback",
        },
        {
          type: "result",
          content: "I don't see any recent changes to roll back. If you've executed a recommendation, I can help you revert it. Otherwise, let me know what you'd like to do.",
        },
      ],
    }
  }

  return {
    events: [
      {
        type: "routing",
        service: "experiments",
        capability: "rollback",
        thinking: "Processing rollback request...",
      },
      {
        type: "thinking",
        content: `Preparing to revert changes from ${executedExp.name}...`,
      },
      {
        type: "tool",
        name: "rollback_configuration",
        params: {
          experimentId: executedExp.id,
          action: "revert_to_previous",
        },
      },
      {
        type: "tool_result",
        name: "rollback_configuration",
        result: {
          success: true,
          message: "Configuration reverted to previous state",
          restoredTraffic: executedExp.arms.map(a => ({
            network: a.networkProvider,
            percentage: a.trafficPercentage,
          })),
        },
      },
      {
        type: "result",
        content: `## Rollback Complete

I've reverted the traffic configuration for **${executedExp.name}**.

### Restored Settings
${executedExp.arms.map(a => `- **${a.networkProvider}**: ${a.trafficPercentage}%`).join("\n")}

The previous configuration is now active. Let me know if you need anything else.`,
      },
    ],
    sideEffects: {
      updateExperiment: {
        id: executedExp.id,
        updates: {
          status: "running",
          endDate: null,
        },
      },
    },
  }
}

/**
 * Handle unknown/unmatched intent
 */
export function handleUnknown(_context: ScenarioContext): ScenarioResult {
  const events: StreamEventItem[] = [
    {
      type: "routing",
      service: "experiments",
      capability: "fallback",
    },
    {
      type: "result",
      content: FALLBACK_MESSAGE,
    },
  ]

  return { events }
}

const HELP_MESSAGE = `## Kovio Intelligence - Experiments Assistant

I can help you create, monitor, and optimize cross-platform A/B tests for your ad mediation strategy.

### What I Can Do

**Create Experiments**
> "Create an A/B test comparing AdMob and MAX with 60/40 traffic split"
> "Set up a 50/50 split test for US and CA users"
> "Start an experiment testing MAX against AdMob for rewarded video"

**Get Insights**
> "Which platform is performing better?"
> "Show me the results of my experiment"
> "What's the winner so far?"

**Execute Recommendations**
> "Execute the recommendation"
> "Apply the traffic shift"
> "Do it"

**Run Simulations**
> "What if we shift 20% more traffic to AdMob?"
> "Simulate increasing MAX allocation by 30%"
> "What would happen if we gave AdMob 70%?"

**Manage Experiments**
> "List my experiments"
> "Undo" or "Rollback"

### Tips
- Mention specific networks (AdMob, MAX, ironSource, Unity)
- Include percentages for traffic allocation
- Specify countries for targeting (US, CA, GB, etc.)
- Set duration in days

What would you like to do?`

const FALLBACK_MESSAGE = `I'm not quite sure what you're asking. Here are some things I can help with:

**Create an experiment:**
> "Create an A/B test comparing AdMob and MAX"

**Check performance:**
> "Which platform is performing better?"

**Execute a recommendation:**
> "Apply the recommendation"

**Run a simulation:**
> "What if we shift 20% more to AdMob?"

Say "help" for more detailed instructions.`
