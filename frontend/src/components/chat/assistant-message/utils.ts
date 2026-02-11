import type { LucideIcon } from "lucide-react"
import { FileSearch, Plus, PenLine, Trash2 } from "lucide-react"

// =============================================================================
// Constants
// =============================================================================

/** Unified compact card height */
export const CARD_HEIGHT = "h-10"
export const CARD_PADDING = "px-3"

/** Keywords that indicate write operations - hoisted for O(1) lookup */
export const WRITE_OPERATION_KEYWORDS = [
  "create", "update", "patch", "delete", "batch",
  "activate", "deactivate", "archive", "submit",
  "allow", "block", "cancel", "stop", "run_networks_reports"
] as const

/** Keywords grouped by operation type for icon selection */
export const DELETE_KEYWORDS = ["delete", "archive", "remove"] as const
export const CREATE_KEYWORDS = ["create", "add", "new"] as const
export const UPDATE_KEYWORDS = ["update", "patch", "edit", "modify", "activate", "deactivate"] as const

// =============================================================================
// Tool Metadata
// =============================================================================

export interface ToolMetadata {
  displayName: string
  category: string  // e.g., "Ad Manager > Ad Units"
  operationType: "Create" | "Update" | "Delete" | "Batch" | "Action"
  riskLevel: "low" | "medium" | "high"
  entityType: string  // e.g., "Ad Unit", "Order", "Site"
  docUrl?: string
}

/** Extract short tool name from full MCP tool path */
export function getShortToolName(fullName: string): string {
  const parts = fullName.split("__")
  return parts[parts.length - 1] || fullName
}

export function getToolMetadata(mcpToolName: string): ToolMetadata {
  const shortName = getShortToolName(mcpToolName)

  // Determine provider
  const isAdMob = shortName.startsWith("admob_")
  const isAdManager = shortName.startsWith("admanager_")
  const provider = isAdMob ? "AdMob" : isAdManager ? "Ad Manager" : "Tool"

  // Remove prefix and clean name
  let cleanName = shortName
    .replace(/^admob_/, "")
    .replace(/^admanager_/, "")
    .replace(/networks_/g, "")

  // Determine operation type
  let operationType: ToolMetadata["operationType"] = "Action"
  if (cleanName.startsWith("batch_")) {
    operationType = "Batch"
    cleanName = cleanName.replace(/^batch_/, "")
  } else if (cleanName.startsWith("create_")) {
    operationType = "Create"
  } else if (cleanName.startsWith("patch_") || cleanName.startsWith("update_")) {
    operationType = "Update"
  } else if (cleanName.startsWith("delete_")) {
    operationType = "Delete"
  }

  // Extract entity type
  const entityParts = cleanName
    .replace(/^(create|patch|update|delete|activate|deactivate|archive|submit|run|stop|allow|block|cancel)_/, "")
    .replace(/_for_approval$/, "")
    .replace(/_ad_breaks$/, " Ad Breaks")
    .replace(/_ad_review_center_ads$/, "")
    .split("_")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
  const entityType = entityParts.join(" ")
    .replace(/s$/, "") // singularize
    .replace(/By Asset Key$/, "")
    .replace(/By Custom Asset Key$/, "")
    .trim()

  // Determine risk level
  let riskLevel: ToolMetadata["riskLevel"] = "low"
  if (cleanName.includes("delete") || cleanName.includes("archive")) {
    riskLevel = "high"
  } else if (operationType === "Batch") {
    riskLevel = "high"
  } else if (operationType === "Update" || cleanName.includes("deactivate")) {
    riskLevel = "medium"
  } else if (operationType === "Create") {
    riskLevel = "low"
  }

  // Build category path
  const category = `${provider} › ${entityType}s`

  // Format display name
  const displayName = shortName
    .replace(/^admob_/, "")
    .replace(/^admanager_/, "")
    .replace(/networks_/g, "")
    .split("_")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")

  // API documentation URL
  const docUrl = isAdManager
    ? "https://developers.google.com/ad-manager/api/rest"
    : isAdMob
      ? "https://developers.google.com/admob/api/reference/rest"
      : undefined

  return { displayName, category, operationType, riskLevel, entityType, docUrl }
}

// =============================================================================
// Tool Operation Helpers
// =============================================================================

/** Check if a tool requires approval (write operation) - dynamic detection */
export function isWriteOperation(toolName: string): boolean {
  const name = toolName.toLowerCase()
  return WRITE_OPERATION_KEYWORDS.some(keyword => name.includes(keyword))
}

export interface ToolIconResult {
  icon: LucideIcon
  type: "read" | "create" | "update" | "delete"
}

/** Get appropriate icon for tool based on operation type */
export function getToolIcon(toolName: string): ToolIconResult {
  const name = toolName.toLowerCase()

  if (DELETE_KEYWORDS.some(k => name.includes(k))) {
    return { icon: Trash2, type: "delete" }
  }
  if (CREATE_KEYWORDS.some(k => name.includes(k))) {
    return { icon: Plus, type: "create" }
  }
  if (UPDATE_KEYWORDS.some(k => name.includes(k))) {
    return { icon: PenLine, type: "update" }
  }
  // Default to read/fetch icon
  return { icon: FileSearch, type: "read" }
}

// =============================================================================
// JSON Processing
// =============================================================================

/** Syntax highlighting for JSON */
export function highlightJSON(obj: unknown): string {
  const json = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2)
  return json
    .replace(/"([^"]+)":/g, '<span class="text-sky-400">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span class="text-amber-300">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="text-violet-400">$1</span>')
    .replace(/: (true|false)/g, ': <span class="text-emerald-400">$1</span>')
    .replace(/: (null)/g, ': <span class="text-zinc-500">$1</span>')
}

/** Parse content - handles JSON strings, objects, and primitives */
export function parseJsonContent(content: unknown): unknown {
  if (typeof content === "string") {
    try {
      return JSON.parse(content)
    } catch {
      return content
    }
  }
  return content
}

/**
 * Unwrap common wrapper keys for cleaner tree view display
 * e.g., { params: { page_size: 20 } } → { page_size: 20 }
 * Also handles message arrays: [{ type: 'text', text: '...' }] → extracts and parses text
 */
export function unwrapForTreeView(content: unknown): unknown {
  // Handle message arrays like [{ type: 'text', text: '...' }]
  if (Array.isArray(content)) {
    if (content.length > 0 && content.every(item =>
      item && typeof item === "object" && "type" in item && "text" in item
    )) {
      const texts = content.map(item => (item as { text: string }).text)
      if (texts.length === 1) {
        const text = texts[0]
        try {
          return JSON.parse(text)
        } catch {
          return text
        }
      }
      return texts
    }
    return content
  }

  if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>
    const keys = Object.keys(obj)
    if (keys.length === 1) {
      const key = keys[0]
      const wrapperKeys = ["params", "parameters", "data", "result", "response", "input"]
      if (wrapperKeys.includes(key) && typeof obj[key] === "object" && obj[key] !== null) {
        return obj[key]
      }
    }
  }
  return content
}

// =============================================================================
// Model Name Formatting
// =============================================================================

/** Format model name for display (e.g., "claude-sonnet-4-20250514" -> "Sonnet 4") */
export function formatModelName(modelId?: string): string | null {
  if (!modelId) return null

  if (modelId.includes("haiku")) return "Haiku"
  if (modelId.includes("sonnet-4")) return "Sonnet 4"
  if (modelId.includes("sonnet")) return "Sonnet"
  if (modelId.includes("opus")) return "Opus"
  if (modelId.includes("gemini-2.5-flash")) return "Gemini 2.5 Flash"
  if (modelId.includes("gemini")) return "Gemini"
  if (modelId.includes("gpt-4")) return "GPT-4"
  if (modelId.includes("gpt-3")) return "GPT-3.5"

  const parts = modelId.split("/")
  const name = parts[parts.length - 1]
  return name.length > 20 ? name.slice(0, 20) + "..." : name
}
