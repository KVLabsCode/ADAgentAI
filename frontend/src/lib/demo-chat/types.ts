/**
 * Types for Demo Chat feature
 */

import type { StreamEventItem } from "@/lib/types"
import type { Experiment } from "@/lib/experiments/types"

/**
 * Intent types that can be detected from user input
 */
export type DemoChatIntent =
  | "CREATE_EXPERIMENT"
  | "GET_INSIGHTS"
  | "EXECUTE_RECOMMENDATION"
  | "SIMULATE_WHATIF"
  | "ROLLBACK"
  | "LIST_EXPERIMENTS"
  | "HELP"
  | "UNKNOWN"

/**
 * Result of intent matching
 */
export interface IntentMatchResult {
  intent: DemoChatIntent
  confidence: number // 0-1
  extractedEntities?: {
    experimentName?: string
    experimentId?: string
    platforms?: string[]
    percentages?: number[]
    countries?: string[]
  }
}

/**
 * Side effects that a scenario can trigger
 */
export interface ScenarioSideEffects {
  createExperiment?: Experiment
  updateExperiment?: {
    id: string
    updates: Partial<Experiment>
  }
}

/**
 * Result from a scenario handler
 */
export interface ScenarioResult {
  /** Stream events to simulate */
  events: StreamEventItem[]
  /** Optional side effects to apply after streaming */
  sideEffects?: ScenarioSideEffects
}

/**
 * Context passed to scenario handlers
 */
export interface ScenarioContext {
  /** User's input message */
  userInput: string
  /** Matched intent */
  intent: DemoChatIntent
  /** All current experiments (static + chat-created) */
  experiments: Experiment[]
  /** Extracted entities from intent matching */
  entities?: IntentMatchResult["extractedEntities"]
}
