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
} from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { useState } from "react"
import { JsonTreeViewCompact } from "@/components/chat/json-tree-view"
import { ScrollArea } from "@/molecules/scroll-area"

type ViewMode = "tree" | "json"

export type ToolPart = {
  type: string
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
    | "approval-pending"
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

/**
 * Unwrap data if it has a single wrapper key like "params", "input", "args", etc.
 * This shows the actual parameters directly instead of wrapped in a container.
 */
function unwrapSingleKey(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data) return data

  const keys = Object.keys(data)
  // If there's exactly one key that looks like a wrapper, unwrap it
  if (keys.length === 1) {
    const key = keys[0]
    const wrapperKeys = ["params", "input", "args", "arguments", "data", "payload"]
    if (wrapperKeys.includes(key.toLowerCase())) {
      const inner = data[key]
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        return inner as Record<string, unknown>
      }
    }
  }
  return data
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

const Tool = ({ toolPart, defaultOpen = false, className, approvalContent }: ToolProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [viewMode, setViewMode] = useState<ViewMode>("tree")

  const { state, input: rawInput, output: rawOutput, toolCallId: _toolCallId } = toolPart

  // Unwrap input/output if they have single wrapper keys
  const input = unwrapSingleKey(rawInput)
  const output = rawOutput

  // Check if we have actual content to display
  const hasInput = hasContent(input)
  const hasOutput = hasContent(output)

  const getStateIcon = () => {
    switch (state) {
      case "input-streaming":
        return <Spinner size="sm" className="text-blue-500" />
      case "input-available":
        return <Settings className="h-4 w-4 text-orange-500" />
      case "output-available":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "output-error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "approval-pending":
        return <Clock className="h-4 w-4 text-orange-500" />
      default:
        return <Settings className="text-muted-foreground h-4 w-4" />
    }
  }

  const getStateBadge = () => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    switch (state) {
      case "input-streaming":
        return (
          <span
            className={cn(
              baseClasses,
              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            )}
          >
            Processing
          </span>
        )
      case "input-available":
        return (
          <span
            className={cn(
              baseClasses,
              "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            )}
          >
            Ready
          </span>
        )
      case "output-available":
        return (
          <span
            className={cn(
              baseClasses,
              "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            )}
          >
            Completed
          </span>
        )
      case "output-error":
        return (
          <span
            className={cn(
              baseClasses,
              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            Error
          </span>
        )
      case "approval-pending":
        return (
          <span
            className={cn(
              baseClasses,
              "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            )}
          >
            Awaiting Approval
          </span>
        )
      default:
        return (
          <span
            className={cn(
              baseClasses,
              "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
            )}
          >
            Pending
          </span>
        )
    }
  }

  const formatValue = (value: unknown): string => {
    if (value === null) return "null"
    if (value === undefined) return "undefined"
    if (typeof value === "string") return value
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return (
    <div
      className={cn(
        "mt-3 rounded-lg border",
        "border-zinc-200/60 dark:border-zinc-700/40",
        "bg-zinc-50/50 dark:bg-zinc-900/30",
        className
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto w-full justify-between rounded-b-none px-3 py-2 font-normal hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30"
          >
            <div className="flex items-center gap-2">
              {getStateIcon()}
              <span className="font-mono text-sm font-medium">
                {toolPart.type}
              </span>
              {getStateBadge()}
            </div>
            <ChevronDown className={cn("h-4 w-4", isOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            "border-t border-zinc-200/60 dark:border-zinc-700/40",
            "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
          )}
          // Force overflow visible when open - inline style overrides Radix's inline overflow:hidden
          style={isOpen ? { overflow: 'visible' } : undefined}
        >
          <div className="space-y-3 p-3">
            {/* View Mode Toggle - single icon button */}
            {(hasInput || hasOutput) && (
              <div className="flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    setViewMode(viewMode === "tree" ? "json" : "tree")
                  }}
                >
                  {viewMode === "tree" ? (
                    <Code2 className="h-3.5 w-3.5" />
                  ) : (
                    <ListTree className="h-3.5 w-3.5" />
                  )}
                  <span className="sr-only">Toggle {viewMode === "tree" ? "JSON" : "tree"} view</span>
                </Button>
              </div>
            )}

            {input && (
              <div>
                <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                  Input
                </h4>
                <div className="rounded-md border border-zinc-200/80 dark:border-zinc-700/50 bg-background p-3">
                  {viewMode === "tree" ? (
                    <JsonTreeViewCompact
                      data={input}
                      collapsed={3}
                      maxHeight="140px"
                    />
                  ) : (
                    <ScrollArea className="max-h-[140px]">
                      <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                        {formatValue(input)}
                      </pre>
                    </ScrollArea>
                  )}
                </div>
              </div>
            )}

            {output && (
              <div>
                <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
                  Output
                </h4>
                <div className="rounded-md border border-zinc-200/80 dark:border-zinc-700/50 bg-background p-3">
                  {viewMode === "tree" ? (
                    <JsonTreeViewCompact
                      data={output}
                      collapsed={3}
                      maxHeight="200px"
                    />
                  ) : (
                    <ScrollArea className="max-h-[200px]">
                      <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                        {formatValue(output)}
                      </pre>
                    </ScrollArea>
                  )}
                </div>
              </div>
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
