/**
 * Step utilities for chat timeline
 * Maps stream events to display icons and labels
 */

import type { StreamEventItem } from "@/lib/types"

export type StepCategory =
  | "routing"
  | "thinking"
  | "reading"
  | "searching"
  | "creating"
  | "updating"
  | "deleting"
  | "action"
  | "content"

// Lucide icon names for each category
export type StepIconName =
  | "GitBranch"
  | "Lightbulb"
  | "Search"
  | "FileSearch"
  | "Plus"
  | "Pencil"
  | "Trash2"
  | "Zap"
  | "MessageSquare"
  | "Check"
  | "X"
  | "Circle"

export interface StepInfo {
  icon: StepIconName
  label: string
  category: StepCategory
  result?: string
}

/**
 * Extract entity name from tool name
 * e.g., "admob_list_accounts" → "accounts"
 * e.g., "admob_create_ad_unit" → "ad unit"
 */
export function extractEntity(toolName: string): string {
  // Remove provider prefix
  let name = toolName
    .replace(/^admob_/, "")
    .replace(/^admanager_/, "")
    .replace(/^networks_/, "")

  // Remove operation prefix
  name = name
    .replace(/^list_/, "")
    .replace(/^get_/, "")
    .replace(/^create_/, "")
    .replace(/^update_/, "")
    .replace(/^patch_/, "")
    .replace(/^delete_/, "")
    .replace(/^batch_/, "")
    .replace(/^search_/, "")
    .replace(/^generate_/, "")

  // Convert underscores to spaces and format
  return name
    .replace(/_/g, " ")
    .replace(/s$/, "") // Remove trailing 's' for singular
    .trim()
}

/**
 * Get provider name from tool name
 */
export function getProvider(toolName: string): string {
  if (toolName.toLowerCase().includes("admob")) return "AdMob"
  if (toolName.toLowerCase().includes("admanager")) return "Ad Manager"
  return "API"
}

/**
 * Determine step category from tool name
 */
export function getStepCategory(toolName: string): StepCategory {
  const name = toolName.toLowerCase()

  // Reading operations (list, get, generate reports)
  if (name.includes("list_") || name.includes("get_") || name.includes("generate_") || name.includes("_report")) return "reading"
  if (name.includes("search_")) return "searching"
  if (name.includes("create_") || name.includes("add_")) return "creating"
  if (name.includes("update_") || name.includes("patch_") || name.includes("edit_")) return "updating"
  if (name.includes("delete_") || name.includes("remove_") || name.includes("archive_")) return "deleting"

  return "action"
}

/**
 * Get Lucide icon name for step category
 */
export function getCategoryIcon(category: StepCategory): StepIconName {
  const icons: Record<StepCategory, StepIconName> = {
    routing: "GitBranch",
    thinking: "Lightbulb",
    reading: "Search",
    searching: "FileSearch",
    creating: "Plus",
    updating: "Pencil",
    deleting: "Trash2",
    action: "Zap",
    content: "MessageSquare"
  }
  return icons[category]
}

/**
 * Extract a short descriptive phrase from content (like Claude/ChatGPT status).
 * Returns the first meaningful sentence or phrase, truncated to ~50 chars.
 *
 * Examples:
 * - "Let me analyze your revenue data..." → "Analyzing revenue data"
 * - "I'll check the AdMob API for..." → "Checking AdMob API"
 * - "Looking at your mediation groups..." → "Looking at mediation groups"
 */
function extractShortPhrase(content: string): string | null {
  if (!content || content.length < 10) return null

  // Clean up the content
  let text = content.trim()

  // Remove common preambles
  const preambles = [
    /^(let me |i'll |i will |i'm going to |i am going to |let's )/i,
    /^(okay,? |sure,? |alright,? |yes,? )/i,
    /^(now |first |next )/i,
  ]
  for (const regex of preambles) {
    text = text.replace(regex, "")
  }

  // Get first sentence or phrase (up to period, newline, or em-dash)
  const firstSentence = text.split(/[.\n—]/)[0]?.trim() || text

  // Convert to present participle form for action verbs
  // "check the API" → "Checking the API"
  // "analyze your data" → "Analyzing your data"
  let phrase = firstSentence
  const verbMappings: [RegExp, string][] = [
    [/^(check|checking)\b/i, "Checking"],
    [/^(analyze|analyzing|analyse|analysing)\b/i, "Analyzing"],
    [/^(look|looking)\b/i, "Looking at"],
    [/^(search|searching)\b/i, "Searching"],
    [/^(query|querying)\b/i, "Querying"],
    [/^(fetch|fetching)\b/i, "Fetching"],
    [/^(get|getting)\b/i, "Getting"],
    [/^(retrieve|retrieving)\b/i, "Retrieving"],
    [/^(find|finding)\b/i, "Finding"],
    [/^(review|reviewing)\b/i, "Reviewing"],
    [/^(examine|examining)\b/i, "Examining"],
    [/^(calculate|calculating)\b/i, "Calculating"],
    [/^(compare|comparing)\b/i, "Comparing"],
    [/^(generate|generating)\b/i, "Generating"],
    [/^(create|creating)\b/i, "Creating"],
    [/^(update|updating)\b/i, "Updating"],
    [/^(process|processing)\b/i, "Processing"],
    [/^(prepare|preparing)\b/i, "Preparing"],
    [/^(load|loading)\b/i, "Loading"],
    [/^(read|reading)\b/i, "Reading"],
    [/^(understand|understanding)\b/i, "Understanding"],
    [/^(think|thinking)\b/i, "Thinking about"],
    [/^(consider|considering)\b/i, "Considering"],
    [/^(evaluate|evaluating)\b/i, "Evaluating"],
  ]

  for (const [regex, replacement] of verbMappings) {
    if (regex.test(phrase)) {
      phrase = phrase.replace(regex, replacement)
      break
    }
  }

  // Capitalize first letter
  phrase = phrase.charAt(0).toUpperCase() + phrase.slice(1)

  // Truncate if too long (aim for ~50 chars max for UI)
  if (phrase.length > 55) {
    // Find a good break point
    const breakPoint = phrase.lastIndexOf(" ", 50)
    if (breakPoint > 30) {
      phrase = phrase.slice(0, breakPoint) + "..."
    } else {
      phrase = phrase.slice(0, 52) + "..."
    }
  }

  // Remove trailing punctuation except ...
  phrase = phrase.replace(/[,;:]$/, "")

  return phrase || null
}

/**
 * Convert a stream event to step display info
 */
export function getStepInfo(event: StreamEventItem): StepInfo {
  if (event.type === "routing") {
    return {
      icon: "GitBranch",
      label: `Routing to ${event.service} → ${event.capability}`,
      category: "routing"
    }
  }

  if (event.type === "thinking") {
    return {
      icon: "Lightbulb",
      label: "Thinking...",
      category: "thinking"
    }
  }

  if (event.type === "content") {
    // Extract a short descriptive phrase from the content
    const shortPhrase = extractShortPhrase(event.content)
    return {
      icon: "MessageSquare",
      label: shortPhrase || "Responding...",
      category: "content"
    }
  }

  if (event.type === "tool") {
    const category = getStepCategory(event.name)
    const entity = extractEntity(event.name)
    const provider = getProvider(event.name)

    const labels: Record<StepCategory, string> = {
      routing: `Routing`,
      thinking: `Thinking`,
      reading: `Reading ${entity}s from ${provider}`,
      searching: `Searching for ${entity}s`,
      creating: `Creating ${entity}`,
      updating: `Updating ${entity}`,
      deleting: `Deleting ${entity}`,
      action: `Running ${entity}`,
      content: `Processing`
    }

    return {
      icon: getCategoryIcon(category),
      label: labels[category],
      category
    }
  }

  if (event.type === "tool_result") {
    // Try to extract a summary from the result
    const result = event.result
    let summary: string | undefined

    if (result && typeof result === "object") {
      // Handle array results
      if (Array.isArray(result)) {
        summary = `Found ${result.length} items`
      }
      // Handle object with common count/length properties
      else if ("count" in result) {
        summary = `Found ${(result as { count: number }).count} items`
      }
      else if ("items" in result && Array.isArray((result as { items: unknown[] }).items)) {
        summary = `Found ${(result as { items: unknown[] }).items.length} items`
      }
    }

    const category = getStepCategory(event.name)
    return {
      icon: "Check",
      label: `Completed ${extractEntity(event.name)}`,
      category,
      result: summary
    }
  }

  if (event.type === "tool_approval_required") {
    const category = getStepCategory(event.tool_name)
    return {
      icon: getCategoryIcon(category),
      label: `${category === "creating" ? "Create" : category === "updating" ? "Update" : category === "deleting" ? "Delete" : "Execute"} ${extractEntity(event.tool_name)}`,
      category
    }
  }

  if (event.type === "tool_denied") {
    return {
      icon: "X",
      label: `Denied: ${extractEntity(event.tool_name)}`,
      category: "action"
    }
  }

  if (event.type === "tool_cancelled") {
    return {
      icon: "X",
      label: `Cancelled: ${extractEntity(event.tool_name)}`,
      category: "action"
    }
  }

  if (event.type === "tool_executing") {
    // Tool execution started after approval
    const category = getStepCategory(event.tool_name)
    const entity = extractEntity(event.tool_name)
    return {
      icon: getCategoryIcon(category),
      label: `Executing ${entity}...`,
      category
    }
  }

  if (event.type === "finished") {
    return {
      icon: "Check",
      label: event.message || "Finished",
      category: "action"
    }
  }

  // Fallback
  return {
    icon: "Circle",
    label: "Processing...",
    category: "action"
  }
}

/**
 * Format result summary for display in timeline
 */
export function formatResultSummary(result: unknown): string | undefined {
  if (!result) return undefined

  if (typeof result === "string") {
    return result.length > 100 ? result.slice(0, 100) + "..." : result
  }

  if (Array.isArray(result)) {
    return `${result.length} ${result.length === 1 ? "item" : "items"}`
  }

  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>
    if ("count" in obj) return `${obj.count} items`
    if ("total" in obj) return `${obj.total} total`
    if ("items" in obj && Array.isArray(obj.items)) {
      return `${obj.items.length} ${obj.items.length === 1 ? "item" : "items"}`
    }
    if ("message" in obj) return String(obj.message)
    if ("status" in obj) return String(obj.status)
    if ("success" in obj) return obj.success ? "Success" : "Failed"
  }

  return undefined
}

/**
 * Check if an event should be included in the steps timeline
 */
export function isTimelineStep(event: StreamEventItem): boolean {
  // Include: routing, thinking, content (intermediate text), tool, tool_executing, tool_result, finished
  // Exclude: result (final answer - rendered in FinalAnswerBlock), tool_approval_required (rendered separately)
  return ["routing", "thinking", "content", "tool", "tool_executing", "tool_result", "finished"].includes(event.type)
}

/**
 * Check if event is the final result (to be rendered prominently)
 */
export function isFinalResult(event: StreamEventItem): boolean {
  return event.type === "result"
}

/**
 * Extract actual content from MCP/LangChain content blocks.
 *
 * MCP tools return results as list of content blocks with structure:
 * [{"id": "lc_xxx", "text": "actual content", "type": "text"}, ...]
 *
 * This extracts the actual content from these blocks.
 * If the result is already the actual content (not wrapped), returns as-is.
 */
export function extractMcpContent(result: unknown): unknown {
  // If not an array, return as-is
  if (!Array.isArray(result) || result.length === 0) {
    return result
  }

  // Check if this looks like MCP content block format
  const firstItem = result[0]
  if (
    typeof firstItem === "object" &&
    firstItem !== null &&
    "type" in firstItem &&
    ("text" in firstItem || "content" in firstItem)
  ) {
    // Extract text content from each block
    const texts: unknown[] = []
    for (const block of result) {
      if (typeof block === "object" && block !== null) {
        const b = block as Record<string, unknown>
        if (b.type === "text" && "text" in b) {
          const textContent = b.text
          // The text might be a JSON string - try to parse it
          if (typeof textContent === "string") {
            try {
              const parsed = JSON.parse(textContent)
              texts.push(parsed)
            } catch {
              texts.push(textContent)
            }
          } else {
            texts.push(textContent)
          }
        } else if ("content" in b) {
          texts.push(b.content)
        }
      }
    }

    // Return based on what we extracted
    if (texts.length === 0) {
      return result // Fallback to original if no text blocks found
    } else if (texts.length === 1) {
      return texts[0] // Single result - return directly
    } else {
      return texts // Multiple results - return as list
    }
  }

  // Not MCP format, return as-is
  return result
}
