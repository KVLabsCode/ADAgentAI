"use client"

import { Button } from "@/atoms/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/molecules/collapsible"
import { cn } from "@/lib/utils"
import {
  CheckCircle,
  ChevronDown,
  Settings,
  XCircle,
  Code2,
  ListTree,
  Clock,
  type LucideIcon,
} from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { useState, useCallback, memo } from "react"
import { JsonTreeViewCompact } from "@/components/chat/json-tree-view"
import { ScrollArea } from "@/molecules/scroll-area"

// =============================================================================
// Types
// =============================================================================

type ViewMode = "tree" | "json"

type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error"
  | "approval-pending"

export type ToolPart = {
  type: string
  state: ToolState
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  toolCallId?: string
  errorText?: string
}

export type ToolProps = {
  toolPart: ToolPart
  defaultOpen?: boolean
  className?: string
  approvalContent?: React.ReactNode
}

// =============================================================================
// Tool State Configuration - O(1) lookup via Map (replaces switch statements)
// =============================================================================

interface ToolStateConfig {
  icon: LucideIcon | null  // null means use Spinner
  iconClassName: string
  badgeClassName: string
  badgeLabel: string
}

const TOOL_STATE_CONFIG = new Map<ToolState, ToolStateConfig>([
  ["input-streaming", {
    icon: null,  // Spinner component (not a LucideIcon)
    iconClassName: "text-blue-500",
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    badgeLabel: "Processing",
  }],
  ["input-available", {
    icon: Settings,
    iconClassName: "text-orange-500",
    badgeClassName: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    badgeLabel: "Ready",
  }],
  ["output-available", {
    icon: CheckCircle,
    iconClassName: "text-green-500",
    badgeClassName: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    badgeLabel: "Completed",
  }],
  ["output-error", {
    icon: XCircle,
    iconClassName: "text-red-500",
    badgeClassName: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    badgeLabel: "Error",
  }],
  ["approval-pending", {
    icon: Clock,
    iconClassName: "text-orange-500",
    badgeClassName: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    badgeLabel: "Awaiting Approval",
  }],
])

// Default config for unknown states
const DEFAULT_STATE_CONFIG: ToolStateConfig = {
  icon: Settings,
  iconClassName: "text-muted-foreground",
  badgeClassName: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  badgeLabel: "Pending",
}

// =============================================================================
// Pure Helper Functions (hoisted outside component)
// =============================================================================

// Known wrapper keys for unwrapping - hoisted for reuse
const WRAPPER_KEYS = new Set([
  "params", "input", "args", "arguments", "data",
  "payload", "result", "response", "output", "body", "content"
])

/**
 * Unwrap data if it has a single wrapper key like "params", "input", "args", etc.
 * This shows the actual parameters directly instead of wrapped in a container.
 */
function unwrapSingleKey(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data) return data

  const keys = Object.keys(data)
  // If there's exactly one key that's a known wrapper, unwrap to show inner content directly
  if (keys.length === 1) {
    const key = keys[0]
    if (WRAPPER_KEYS.has(key.toLowerCase())) {
      const inner = data[key]
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        return inner as Record<string, unknown>
      }
    }
  }
  return data
}

/**
 * Extract single-key object to display value directly (eliminating redundant root level).
 * Returns { key, value } if data has exactly one key, otherwise returns { key: null, value: data }.
 */
function extractSingleKey(data: unknown): { key: string | null; value: unknown } {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const keys = Object.keys(data)
    if (keys.length === 1) {
      return { key: keys[0], value: (data as Record<string, unknown>)[keys[0]] }
    }
  }
  return { key: null, value: data }
}

/**
 * Check if data has actual content (not empty object/array/null/undefined)
 */
function hasContent(data: unknown): boolean {
  if (data === null || data === undefined) return false
  if (typeof data === "string") return data.length > 0
  if (Array.isArray(data)) return data.length > 0
  if (typeof data === "object") return Object.keys(data).length > 0
  return true
}

/**
 * Format a value for JSON display
 */
function formatValue(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "string") return value
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

// =============================================================================
// Sub-components (memoized for performance)
// =============================================================================

interface ToolStateIconProps {
  state: ToolState
}

const ToolStateIcon = memo(function ToolStateIcon({ state }: ToolStateIconProps) {
  const config = TOOL_STATE_CONFIG.get(state) ?? DEFAULT_STATE_CONFIG

  // Special case: input-streaming uses Spinner component
  if (state === "input-streaming") {
    return <Spinner size="sm" className={config.iconClassName} />
  }

  const Icon = config.icon!
  return <Icon className={cn("h-4 w-4", config.iconClassName)} />
})

interface ToolStateBadgeProps {
  state: ToolState
}

const ToolStateBadge = memo(function ToolStateBadge({ state }: ToolStateBadgeProps) {
  const config = TOOL_STATE_CONFIG.get(state) ?? DEFAULT_STATE_CONFIG

  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", config.badgeClassName)}>
      {config.badgeLabel}
    </span>
  )
})

interface ViewModeToggleProps {
  viewMode: ViewMode
  onToggle: () => void
}

const ViewModeToggle = memo(function ViewModeToggle({ viewMode, onToggle }: ViewModeToggleProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle()
  }, [onToggle])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.stopPropagation()
      onToggle()
    }
  }, [onToggle])

  return (
    <div
      role="button"
      tabIndex={0}
      className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {viewMode === "tree" ? (
        <Code2 className="h-3.5 w-3.5" />
      ) : (
        <ListTree className="h-3.5 w-3.5" />
      )}
      <span className="sr-only">Toggle {viewMode === "tree" ? "JSON" : "tree"} view</span>
    </div>
  )
})

interface DataSectionProps {
  title: string
  titleKey: string | null
  data: unknown
  viewMode: ViewMode
  maxHeight: string
}

const DataSection = memo(function DataSection({ title, titleKey, data, viewMode, maxHeight }: DataSectionProps) {
  return (
    <div>
      <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
        {title}{titleKey && <span className="ml-1 normal-case text-violet-400">({titleKey})</span>}
      </h4>
      <div className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] p-3">
        {viewMode === "tree" ? (
          <JsonTreeViewCompact
            data={data}
            collapsed={3}
            maxHeight={maxHeight}
          />
        ) : (
          <ScrollArea maxHeight={maxHeight}>
            <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">
              {formatValue(data)}
            </pre>
          </ScrollArea>
        )}
      </div>
    </div>
  )
})

// =============================================================================
// Main Component
// =============================================================================

const Tool = ({ toolPart, defaultOpen = false, className, approvalContent }: ToolProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [viewMode, setViewMode] = useState<ViewMode>("tree")

  const { state, input: rawInput, output: rawOutput } = toolPart

  // Unwrap input/output if they have single wrapper keys
  const input = unwrapSingleKey(rawInput)
  const output = unwrapSingleKey(rawOutput)

  // Check if we have actual content to display
  const hasInput = hasContent(input)
  const hasOutput = hasContent(output)

  // Stable callback for view mode toggle
  const handleViewModeToggle = useCallback(() => {
    setViewMode(prev => prev === "tree" ? "json" : "tree")
  }, [])

  // Extract keys for display
  const inputExtracted = input ? extractSingleKey(input) : null
  const outputExtracted = output ? extractSingleKey(output) : null

  return (
    <div
      className={cn(
        "mt-3 rounded-[var(--card-radius)] border-[length:var(--card-border-width)]",
        "border-[var(--card-border)] bg-[var(--card-bg)]",
        className
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className="h-auto w-full justify-between rounded-b-none px-3 py-2 font-normal hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30"
            />
          }
        >
          <div className="flex items-center gap-2">
            <ToolStateIcon state={state} />
            <span className="text-sm font-medium">
              {toolPart.type}
            </span>
            <ToolStateBadge state={state} />
          </div>
          <div className="flex items-center gap-1">
            {isOpen && (hasInput || hasOutput) && (
              <ViewModeToggle viewMode={viewMode} onToggle={handleViewModeToggle} />
            )}
            <ChevronDown className={cn("h-4 w-4", isOpen && "rotate-180")} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            "border-t border-[var(--card-header-border)]",
            "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
          )}
          // Force overflow visible when open - inline style overrides Radix's inline overflow:hidden
          style={isOpen ? { overflow: 'visible' } : undefined}
        >
          <div className="space-y-3 p-3">
            {inputExtracted && (
              <DataSection
                title="Input"
                titleKey={inputExtracted.key}
                data={inputExtracted.value}
                viewMode={viewMode}
                maxHeight="140px"
              />
            )}

            {outputExtracted && (
              <DataSection
                title="Output"
                titleKey={outputExtracted.key}
                data={outputExtracted.value}
                viewMode={viewMode}
                maxHeight="200px"
              />
            )}

            {state === "output-error" && toolPart.errorText && (
              <div className="rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-3">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-red-600 dark:text-red-400">
                  Error
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {toolPart.errorText}
                </p>
              </div>
            )}

            {state === "input-streaming" && (
              <div className="text-muted-foreground text-sm italic">
                Processing tool call...
              </div>
            )}

            {approvalContent}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export { Tool }
