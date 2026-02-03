/**
 * Streaming simulator for demo chat
 * Simulates the streaming behavior of the real chat API
 */

import type { StreamEventItem } from "@/lib/types"

/**
 * Configuration for streaming simulation
 */
interface StreamingConfig {
  /** Base delay between events in ms */
  baseDelay: number
  /** Random variance added to delay in ms */
  varianceDelay: number
  /** Delay multiplier for specific event types */
  typeDelays: Partial<Record<StreamEventItem["type"], number>>
}

const DEFAULT_CONFIG: StreamingConfig = {
  baseDelay: 150,
  varianceDelay: 100,
  typeDelays: {
    routing: 0.5, // Routing is fast
    thinking: 1.5, // Thinking takes a moment
    tool: 0.8, // Tool calls are quick
    tool_result: 1.2, // Results take a bit
    result: 0.3, // Final result is quick
  },
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate delay for a specific event type
 */
function getEventDelay(eventType: StreamEventItem["type"], config: StreamingConfig): number {
  const multiplier = config.typeDelays[eventType] ?? 1
  const variance = Math.random() * config.varianceDelay
  return Math.floor((config.baseDelay + variance) * multiplier)
}

/**
 * Simulate streaming events with realistic delays
 */
export async function simulateStream(
  events: StreamEventItem[],
  onEvent: (event: StreamEventItem) => void,
  onComplete: () => void,
  config: Partial<StreamingConfig> = {}
): Promise<void> {
  const mergedConfig: StreamingConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    typeDelays: {
      ...DEFAULT_CONFIG.typeDelays,
      ...config.typeDelays,
    },
  }

  for (const event of events) {
    const delay = getEventDelay(event.type, mergedConfig)
    await sleep(delay)
    onEvent(event)
  }

  // Small delay before completing
  await sleep(100)
  onComplete()
}

/**
 * Create a stream that can be cancelled
 */
export function createCancellableStream(
  events: StreamEventItem[],
  onEvent: (event: StreamEventItem) => void,
  onComplete: () => void,
  config: Partial<StreamingConfig> = {}
): { start: () => Promise<void>; cancel: () => void } {
  let cancelled = false

  const start = async () => {
    const mergedConfig: StreamingConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      typeDelays: {
        ...DEFAULT_CONFIG.typeDelays,
        ...config.typeDelays,
      },
    }

    for (const event of events) {
      if (cancelled) break

      const delay = getEventDelay(event.type, mergedConfig)
      await sleep(delay)

      if (cancelled) break
      onEvent(event)
    }

    if (!cancelled) {
      await sleep(100)
      onComplete()
    }
  }

  const cancel = () => {
    cancelled = true
  }

  return { start, cancel }
}

/**
 * Simulate typing effect for content
 * Breaks content into chunks and streams them progressively
 */
export async function simulateTypingContent(
  content: string,
  onChunk: (partialContent: string) => void,
  wordsPerChunk: number = 3,
  delayPerChunk: number = 50
): Promise<void> {
  const words = content.split(" ")
  let accumulated = ""

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(" ")
    accumulated += (accumulated ? " " : "") + chunk
    onChunk(accumulated)
    await sleep(delayPerChunk + Math.random() * 30)
  }
}
