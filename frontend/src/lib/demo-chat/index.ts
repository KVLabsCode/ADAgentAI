/**
 * Demo Chat library - public exports
 */

// Types
export * from "./types"

// Intent matching
export { matchIntent, quickMatchIntent } from "./intent-matcher"

// Streaming simulation
export { simulateStream, createCancellableStream, simulateTypingContent } from "./streaming-simulator"

// Scenarios
export { getScenarioHandler, executeScenario } from "./scenarios"
