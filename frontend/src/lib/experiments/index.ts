/**
 * Experiments feature - public exports
 */

// Types
export * from "./types"

// Constants
export * from "./constants"

// Demo data
export {
  getDemoExperiments,
  getDemoExperiment,
  generateExperimentMetrics,
  generateRecommendations,
  getDemoExperimentWithData,
} from "./demo-data"

// Prompt parser
export { parseTrafficPrompt, summarizeParsedAllocation } from "./prompt-parser"
