/**
 * Keyword-based intent detection for demo chat
 */

import type { DemoChatIntent, IntentMatchResult } from "./types"

/**
 * Keyword definitions for each intent
 * Higher scores indicate stronger signals
 */
const INTENT_KEYWORDS: Record<DemoChatIntent, { keywords: string[]; weight: number }[]> = {
  CREATE_EXPERIMENT: [
    { keywords: ["create", "new", "start", "set up", "setup", "launch"], weight: 2 },
    { keywords: ["experiment", "a/b test", "ab test", "split test", "test"], weight: 2 },
    { keywords: ["compare", "between", "vs", "versus"], weight: 1 },
    { keywords: ["traffic", "split", "allocate", "allocation"], weight: 1 },
  ],
  GET_INSIGHTS: [
    { keywords: ["which", "what", "how"], weight: 1 },
    { keywords: ["better", "winner", "winning", "best", "top"], weight: 2 },
    { keywords: ["performance", "performing", "results", "insights", "metrics"], weight: 2 },
    { keywords: ["revenue", "arpdau", "ecpm", "impressions", "fill rate"], weight: 1.5 },
    { keywords: ["status", "progress", "doing"], weight: 1 },
  ],
  EXECUTE_RECOMMENDATION: [
    { keywords: ["execute", "apply", "implement", "do it", "proceed"], weight: 3 },
    { keywords: ["approve", "confirm", "accept"], weight: 2 },
    { keywords: ["recommendation", "suggested", "suggestion"], weight: 1.5 },
    { keywords: ["shift", "move", "increase", "decrease"], weight: 1 },
    { keywords: ["traffic", "allocation"], weight: 0.5 },
  ],
  SIMULATE_WHATIF: [
    { keywords: ["simulate", "simulation"], weight: 3 },
    { keywords: ["what if", "whatif", "what-if"], weight: 3 },
    { keywords: ["projection", "project", "forecast", "predict"], weight: 2 },
    { keywords: ["estimate", "estimated"], weight: 1.5 },
    { keywords: ["if we", "if i"], weight: 1 },
  ],
  ROLLBACK: [
    { keywords: ["undo", "rollback", "roll back", "revert"], weight: 3 },
    { keywords: ["cancel", "stop", "abort"], weight: 1.5 },
    { keywords: ["previous", "original", "back to"], weight: 1 },
  ],
  LIST_EXPERIMENTS: [
    { keywords: ["list", "show", "display", "all"], weight: 2 },
    { keywords: ["experiments", "tests"], weight: 2 },
    { keywords: ["running", "active", "completed", "status"], weight: 1 },
  ],
  HELP: [
    { keywords: ["help", "how do", "how can", "what can"], weight: 3 },
    { keywords: ["tutorial", "guide", "instructions"], weight: 2 },
    { keywords: ["example", "examples", "sample"], weight: 1.5 },
    { keywords: ["commands", "options", "capabilities"], weight: 1 },
  ],
  UNKNOWN: [],
}

/**
 * Extract potential entities from user input
 */
function extractEntities(input: string): IntentMatchResult["extractedEntities"] {
  const entities: IntentMatchResult["extractedEntities"] = {}

  // Extract platform names
  const platforms: string[] = []
  if (/\badmob\b/i.test(input)) platforms.push("admob")
  if (/\bmax\b/i.test(input) || /\bapplovin/i.test(input)) platforms.push("max")
  if (/\bironsource\b/i.test(input)) platforms.push("ironsource")
  if (/\bunity\b/i.test(input)) platforms.push("unity")
  if (platforms.length > 0) entities.platforms = platforms

  // Extract percentages
  const percentageMatches = input.match(/(\d+)\s*%/g)
  if (percentageMatches) {
    entities.percentages = percentageMatches.map(p => parseInt(p.replace("%", ""), 10))
  }

  // Extract country codes
  const countryPattern = /\b(US|CA|GB|AU|DE|FR|JP|KR|IN|BR)\b/gi
  const countryMatches = input.match(countryPattern)
  if (countryMatches) {
    entities.countries = [...new Set(countryMatches.map(c => c.toUpperCase()))]
  }

  // Extract experiment ID reference (exp-XXX pattern)
  const idMatch = input.match(/exp-\d{3}/i)
  if (idMatch) {
    entities.experimentId = idMatch[0].toLowerCase()
  }

  return Object.keys(entities).length > 0 ? entities : undefined
}

/**
 * Calculate intent score based on keyword matches
 */
function calculateIntentScore(input: string, intent: DemoChatIntent): number {
  const lower = input.toLowerCase()
  const keywordGroups = INTENT_KEYWORDS[intent]
  let score = 0

  for (const group of keywordGroups) {
    for (const keyword of group.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        score += group.weight
        break // Only count once per group
      }
    }
  }

  return score
}

/**
 * Match user input to an intent with confidence score
 */
export function matchIntent(input: string): IntentMatchResult {
  const intents: DemoChatIntent[] = [
    "CREATE_EXPERIMENT",
    "GET_INSIGHTS",
    "EXECUTE_RECOMMENDATION",
    "SIMULATE_WHATIF",
    "ROLLBACK",
    "LIST_EXPERIMENTS",
    "HELP",
  ]

  // Calculate scores for each intent
  const scores = intents.map(intent => ({
    intent,
    score: calculateIntentScore(input, intent),
  }))

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  // Get the winning intent
  const best = scores[0]
  const secondBest = scores[1]

  // Calculate confidence based on score difference
  // Higher difference = higher confidence
  let confidence = 0
  if (best.score > 0) {
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0)
    confidence = best.score / totalScore

    // Boost confidence if clear winner
    if (secondBest && best.score > secondBest.score * 1.5) {
      confidence = Math.min(confidence * 1.2, 1)
    }
  }

  // Fall back to UNKNOWN if confidence is too low
  const resultIntent: DemoChatIntent = confidence > 0.2 ? best.intent : "UNKNOWN"

  return {
    intent: resultIntent,
    confidence: Math.round(confidence * 100) / 100,
    extractedEntities: extractEntities(input),
  }
}

/**
 * Quick check for specific high-priority intents
 * Used as a fast-path before full matching
 */
export function quickMatchIntent(input: string): DemoChatIntent | null {
  const lower = input.toLowerCase().trim()

  // Help intent
  if (lower === "help" || lower === "?" || lower.startsWith("how do i")) {
    return "HELP"
  }

  // Execute intent (very specific phrases)
  if (
    lower === "do it" ||
    lower === "execute" ||
    lower === "apply" ||
    lower.startsWith("execute the") ||
    lower.startsWith("apply the")
  ) {
    return "EXECUTE_RECOMMENDATION"
  }

  // What-if simulation
  if (lower.startsWith("what if") || lower.startsWith("simulate")) {
    return "SIMULATE_WHATIF"
  }

  // Rollback
  if (lower.startsWith("undo") || lower.startsWith("rollback") || lower.startsWith("revert")) {
    return "ROLLBACK"
  }

  return null
}
