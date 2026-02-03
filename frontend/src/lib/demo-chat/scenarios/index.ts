/**
 * Scenario handlers index
 */

import type { ScenarioContext, ScenarioResult, DemoChatIntent } from "../types"
import { handleCreateExperiment } from "./create-experiment"
import { handleGetInsights } from "./get-insights"
import { handleExecuteRecommendation } from "./execute-recommendation"
import { handleSimulateWhatIf } from "./simulate-whatif"
import { handleHelp, handleListExperiments, handleRollback, handleUnknown } from "./fallback"

export { handleCreateExperiment } from "./create-experiment"
export { handleGetInsights } from "./get-insights"
export { handleExecuteRecommendation } from "./execute-recommendation"
export { handleSimulateWhatIf } from "./simulate-whatif"
export { handleHelp, handleListExperiments, handleRollback, handleUnknown } from "./fallback"

/**
 * Get the appropriate scenario handler for an intent
 */
export function getScenarioHandler(intent: DemoChatIntent): (context: ScenarioContext) => ScenarioResult {
  switch (intent) {
    case "CREATE_EXPERIMENT":
      return handleCreateExperiment
    case "GET_INSIGHTS":
      return handleGetInsights
    case "EXECUTE_RECOMMENDATION":
      return handleExecuteRecommendation
    case "SIMULATE_WHATIF":
      return handleSimulateWhatIf
    case "ROLLBACK":
      return handleRollback
    case "LIST_EXPERIMENTS":
      return handleListExperiments
    case "HELP":
      return handleHelp
    case "UNKNOWN":
    default:
      return handleUnknown
  }
}

/**
 * Execute a scenario and return the result
 */
export function executeScenario(context: ScenarioContext): ScenarioResult {
  const handler = getScenarioHandler(context.intent)
  return handler(context)
}
