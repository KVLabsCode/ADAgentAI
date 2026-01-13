"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Sparkles, Brain, ChevronDown, Clock, Check, X, Route, Terminal, Copy, ThumbsUp, ThumbsDown, CheckCheck, ExternalLink, AlertTriangle, Shield, FileSearch, PenLine, Plus, Trash2, Braces, ListTree } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useChatSettings } from "@/lib/chat-settings"
import type { Message, StreamEventItem, RJSFSchema } from "@/lib/types"
import { RJSFParameterForm } from "./rjsf"
import { JsonTreeView } from "./json-tree-view"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AssistantMessageProps {
  message: Message
  onToolApproval?: (approvalId: string, approved: boolean, modifiedParams?: Record<string, unknown>) => void
  pendingApprovals?: Map<string, boolean | null>
  isStreaming?: boolean
}

// Extract short tool name from full MCP tool path
function getShortToolName(fullName: string): string {
  const parts = fullName.split("__")
  return parts[parts.length - 1] || fullName
}

// =============================================================================
// Tool Metadata Extraction
// =============================================================================

interface ToolMetadata {
  displayName: string
  category: string  // e.g., "Ad Manager > Ad Units"
  operationType: "Create" | "Update" | "Delete" | "Batch" | "Action"
  riskLevel: "low" | "medium" | "high"
  entityType: string  // e.g., "Ad Unit", "Order", "Site"
  docUrl?: string
}

function getToolMetadata(mcpToolName: string): ToolMetadata {
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

// Risk level styling
const RISK_STYLES = {
  low: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  medium: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  high: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
}

// Operation type styling
const OP_STYLES = {
  Create: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  Update: { bg: "bg-amber-500/20", text: "text-amber-400" },
  Delete: { bg: "bg-red-500/20", text: "text-red-400" },
  Batch: { bg: "bg-violet-500/20", text: "text-violet-400" },
  Action: { bg: "bg-sky-500/20", text: "text-sky-400" },
}

// Check if a tool requires approval (write operation) - dynamic detection
function isWriteOperation(toolName: string): boolean {
  const name = toolName.toLowerCase()
  return (
    name.includes("create") ||
    name.includes("update") ||
    name.includes("patch") ||
    name.includes("delete") ||
    name.includes("batch") ||
    name.includes("activate") ||
    name.includes("deactivate") ||
    name.includes("archive") ||
    name.includes("submit") ||
    name.includes("allow") ||
    name.includes("block") ||
    name.includes("cancel") ||
    name.includes("stop") ||
    name.includes("run_networks_reports") // Report runs modify state
  )
}

// Get appropriate icon for tool based on operation type
function getToolIcon(toolName: string): { icon: React.ComponentType<{ className?: string }>; type: "read" | "create" | "update" | "delete" } {
  const name = toolName.toLowerCase()

  if (name.includes("delete") || name.includes("archive") || name.includes("remove")) {
    return { icon: Trash2, type: "delete" }
  }
  if (name.includes("create") || name.includes("add") || name.includes("new")) {
    return { icon: Plus, type: "create" }
  }
  if (name.includes("update") || name.includes("patch") || name.includes("edit") || name.includes("modify") || name.includes("activate") || name.includes("deactivate")) {
    return { icon: PenLine, type: "update" }
  }
  // Default to read/fetch icon
  return { icon: FileSearch, type: "read" }
}

// Syntax highlighting for JSON
function highlightJSON(obj: unknown): React.ReactNode {
  const json = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2)
  const highlighted = json
    .replace(/"([^"]+)":/g, '<span class="text-sky-400">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span class="text-amber-300">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="text-violet-400">$1</span>')
    .replace(/: (true|false)/g, ': <span class="text-emerald-400">$1</span>')
    .replace(/: (null)/g, ': <span class="text-zinc-500">$1</span>')
  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />
}

// Parse content - handles JSON strings, objects, and primitives
function parseJsonContent(content: unknown): unknown {
  if (typeof content === "string") {
    // Try to parse JSON string
    try {
      return JSON.parse(content)
    } catch {
      // Not valid JSON, return as-is
      return content
    }
  }
  return content
}

// Unwrap common wrapper keys for cleaner tree view display
// e.g., { params: { page_size: 20 } } → { page_size: 20 }
// Also handles message arrays: [{ type: 'text', text: '...' }] → extracts and parses text
function unwrapForTreeView(content: unknown): unknown {
  // Handle message arrays like [{ type: 'text', text: '...' }]
  if (Array.isArray(content)) {
    // Check if it's a message array (common LLM response format)
    if (content.length > 0 && content.every(item =>
      item && typeof item === "object" && "type" in item && "text" in item
    )) {
      // Extract just the text content
      const texts = content.map(item => (item as { text: string }).text)
      if (texts.length === 1) {
        // Try to parse the text as JSON (API responses are JSON strings)
        const text = texts[0]
        try {
          return JSON.parse(text)
        } catch {
          return text // Return as string if not valid JSON
        }
      }
      return texts // Return array of texts
    }
    // For other arrays, return as-is
    return content
  }

  if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>
    const keys = Object.keys(obj)
    // Unwrap if only one key and it's a common wrapper
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

// JSON Display - with inline toggle between tree and raw JSON
function JsonDisplay({
  title,
  content,
  maxHeight = "280px",
  collapsed = 2,
  defaultMode = "tree",
}: {
  title: string
  content: unknown
  maxHeight?: string
  collapsed?: number
  defaultMode?: "tree" | "json"
}) {
  const [viewMode, setViewMode] = React.useState<"tree" | "json">(defaultMode)

  // Parse content if it's a JSON string
  const parsedContent = React.useMemo(() => parseJsonContent(content), [content])

  // For tree view, unwrap common wrappers like "params" and parse JSON from text arrays
  const treeContent = React.useMemo(() => unwrapForTreeView(parsedContent), [parsedContent])

  // Can show tree view if content is an object/array
  const canShowTree = treeContent !== null && typeof treeContent === "object"

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
          {title}
        </span>
        {canShowTree && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setViewMode(viewMode === "tree" ? "json" : "tree")}
                  className="p-1 rounded hover:bg-zinc-700/50 transition-colors text-zinc-500 hover:text-zinc-300"
                >
                  {viewMode === "tree" ? (
                    <Braces className="h-3 w-3" />
                  ) : (
                    <ListTree className="h-3 w-3" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {viewMode === "tree" ? "View as JSON" : "View as Tree"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {viewMode === "tree" && canShowTree ? (
        <JsonTreeView
          data={treeContent}
          maxHeight={maxHeight}
          collapsed={collapsed}
          displayObjectSize={false}
          enableClipboard={true}
        />
      ) : (
        <div
          className="rounded-xl overflow-hidden border border-zinc-700/50"
          style={{ maxHeight }}
        >
          <ScrollArea className="h-full bg-zinc-900/80">
            <pre className="p-3 text-[11px] leading-relaxed font-mono text-zinc-300 whitespace-pre-wrap break-all">
              {highlightJSON(typeof treeContent === "object" ? treeContent : parsedContent)}
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

// Unified compact card height
const CARD_HEIGHT = "h-10"
const CARD_PADDING = "px-3"

// Icon box component - colored square behind icon (higher contrast)
function IconBox({ color, children }: { color: "violet" | "amber" | "emerald" | "red" | "zinc"; children: React.ReactNode }) {
  const bgColors = {
    violet: "bg-violet-600/60",
    amber: "bg-amber-600/60",
    emerald: "bg-emerald-600/60",
    red: "bg-red-600/60",
    zinc: "bg-zinc-600/60",
  }
  return (
    <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", bgColors[color])}>
      {children}
    </div>
  )
}

// Routing block - compact collapsed
function RoutingBlock({ service, capability, thinking }: { service: string; capability: string; thinking?: string }) {
  const [isOpen, setIsOpen] = React.useState(false)

  if (!thinking) {
    return (
      <div className={cn(CARD_HEIGHT, CARD_PADDING, "flex items-center gap-2.5 rounded-2xl bg-zinc-800/50 border border-zinc-700/50")}>
        <IconBox color="violet">
          <Route className="h-3.5 w-3.5 text-violet-400" />
        </IconBox>
        <span className="text-xs text-zinc-200">
          <span className="text-zinc-400">Routing to</span>{" "}
          <span className="font-medium text-zinc-100">{service}</span>
          <span className="mx-1.5 text-zinc-500">→</span>
          <span className="font-medium text-zinc-100">{capability}</span>
        </span>
      </div>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-2xl overflow-hidden bg-zinc-800/50 border border-zinc-700/50">
        <CollapsibleTrigger asChild>
          <button className={cn(CARD_HEIGHT, CARD_PADDING, "w-full flex items-center justify-between gap-2 text-left hover:bg-zinc-700/50 transition-colors")}>
            <div className="flex items-center gap-2.5 min-w-0 h-full">
              <IconBox color="violet">
                <Route className="h-3.5 w-3.5 text-violet-400" />
              </IconBox>
              <span className="text-xs text-zinc-200 truncate">
                <span className="text-zinc-400">Routing to</span>{" "}
                <span className="font-medium text-zinc-100">{service}</span>
                <span className="mx-1.5 text-zinc-500">→</span>
                <span className="font-medium text-zinc-100">{capability}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 shrink-0 h-full">
              <Brain className="h-3 w-3" />
              <span className="text-[10px]">reasoning</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-2">
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {thinking}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Thinking block - compact, no preview
function ThinkingBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-2xl overflow-hidden bg-zinc-800/50 border border-zinc-700/50">
        <CollapsibleTrigger asChild>
          <button className={cn(CARD_HEIGHT, CARD_PADDING, "w-full flex items-center justify-between gap-2 text-left hover:bg-zinc-700/50 transition-colors")}>
            <div className="flex items-center gap-2.5">
              <IconBox color="amber">
                <Brain className="h-3.5 w-3.5 text-amber-400" />
              </IconBox>
              <span className="text-xs font-medium text-zinc-200">Thinking...</span>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-2">
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Tool Approval Required - auto-expanded with editable parameters and metadata
interface ToolApprovalBlockProps {
  approvalId: string
  toolName: string
  toolInput: string
  parameterSchema?: RJSFSchema
  onApproval: (approved: boolean, modifiedParams?: Record<string, unknown>) => void
  isPending: boolean
}

function ToolApprovalBlock({ approvalId: _approvalId, toolName, toolInput, parameterSchema, onApproval, isPending }: ToolApprovalBlockProps) {
  const [isOpen, setIsOpen] = React.useState(true) // Auto-expand for approval

  // Debug: Log if schema is received
  console.log("[ToolApprovalBlock] toolName:", toolName, "parameterSchema:", parameterSchema ? "YES" : "NO", parameterSchema)

  // Get tool metadata for enhanced display
  const metadata = React.useMemo(() => getToolMetadata(toolName), [toolName])
  const riskStyle = RISK_STYLES[metadata.riskLevel]
  const opStyle = OP_STYLES[metadata.operationType]

  // Get appropriate icon for this tool type
  const toolIcon = getToolIcon(toolName)
  const ToolIconComponent = metadata.riskLevel === "high" ? AlertTriangle : toolIcon.icon

  // Parse initial values from tool input
  const initialValues = React.useMemo(() => {
    try {
      return JSON.parse(toolInput) as Record<string, unknown>
    } catch {
      return {}
    }
  }, [toolInput])

  // Extract affected entity from params (e.g., ad_units_id, network_code)
  const affectedEntity = React.useMemo(() => {
    const keys = Object.keys(initialValues)
    // Look for ID fields
    const idKey = keys.find(k => k.endsWith("_id") || k === "network_code")
    if (idKey && initialValues[idKey]) {
      return `${idKey.replace(/_/g, " ")}: ${String(initialValues[idKey]).slice(0, 20)}${String(initialValues[idKey]).length > 20 ? "..." : ""}`
    }
    return null
  }, [initialValues])

  // Track modified parameters and validation state
  const [currentValues, setCurrentValues] = React.useState<Record<string, unknown>>(initialValues)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [hasErrors, setHasErrors] = React.useState(false)

  const handleParamChange = React.useCallback((values: Record<string, unknown>, changed: boolean, errors: boolean) => {
    setCurrentValues(values)
    setHasChanges(changed)
    setHasErrors(errors)
  }, [])

  const handleApproval = (approved: boolean) => {
    if (approved && hasChanges) {
      onApproval(true, currentValues)
    } else {
      onApproval(approved)
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-2xl overflow-hidden bg-zinc-800/50 border",
        metadata.riskLevel === "high" ? "border-red-500/30" : "border-zinc-700/50"
      )}>
        <CollapsibleTrigger asChild>
          <button className={cn(CARD_HEIGHT, CARD_PADDING, "w-full flex items-center justify-between gap-2 text-left hover:bg-zinc-700/50 transition-colors")}>
            <div className="flex items-center gap-2.5 min-w-0 h-full">
              <IconBox color={metadata.riskLevel === "high" ? "red" : metadata.riskLevel === "medium" ? "amber" : "emerald"}>
                <ToolIconComponent className={cn("h-3.5 w-3.5", metadata.riskLevel === "high" ? "text-red-400" : metadata.riskLevel === "medium" ? "text-amber-400" : "text-emerald-400")} />
              </IconBox>
              <span className="text-xs font-medium text-zinc-100 truncate">{metadata.displayName}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Operation Type Badge */}
              <Badge className={cn("h-5 text-[8px] font-semibold uppercase tracking-wide px-1.5 border-0 leading-none", opStyle.bg, opStyle.text)}>
                {metadata.operationType}
              </Badge>
              {/* Risk Level Badge */}
              <Badge className={cn("h-5 text-[8px] font-semibold uppercase tracking-wide px-1.5 border-0 leading-none", riskStyle.bg, riskStyle.text)}>
                {metadata.riskLevel === "high" ? "High Risk" : metadata.riskLevel === "medium" ? "Med Risk" : "Low"}
              </Badge>
              <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform duration-200", isOpen && "rotate-180")} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-2.5 border-t border-zinc-700/50 mt-1">
            {/* Metadata Header */}
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-3">
                <span className="text-zinc-500">{metadata.category}</span>
                {affectedEntity && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400 font-mono">{affectedEntity}</span>
                  </>
                )}
              </div>
              {metadata.docUrl && (
                <a
                  href={metadata.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  Docs
                </a>
              )}
            </div>

            {/* Editable form when schema available, otherwise tree/json view */}
            {parameterSchema && isPending ? (
              <RJSFParameterForm
                rjsfSchema={parameterSchema}
                initialValues={initialValues}
                onChange={handleParamChange}
                disabled={!isPending}
              />
            ) : (
              <JsonDisplay title="Request" content={initialValues} maxHeight="140px" collapsed={1} />
            )}

            {/* Approval Actions */}
            {isPending && (
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-700/30">
                <div className="flex items-center gap-2 text-[10px]">
                  {metadata.riskLevel === "high" ? (
                    <>
                      <AlertTriangle className="h-3 w-3 text-red-400" />
                      <span className="text-red-300">This action may have significant impact</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-3 w-3 text-zinc-500" />
                      <span className="text-zinc-400">
                        {hasErrors ? "Fill required fields" : hasChanges ? "Review changes" : "Approval required"}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-[11px] text-zinc-300 hover:text-white hover:bg-red-500/80"
                    onClick={(e) => { e.stopPropagation(); handleApproval(false) }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Deny
                  </Button>
                  <Button
                    size="sm"
                    disabled={hasErrors}
                    className={cn(
                      "h-7 px-3 text-[11px] text-white",
                      hasErrors
                        ? "bg-zinc-600 cursor-not-allowed opacity-50"
                        : hasChanges
                          ? "bg-amber-600 hover:bg-amber-500"
                          : "bg-emerald-600 hover:bg-emerald-500"
                    )}
                    onClick={(e) => { e.stopPropagation(); handleApproval(true) }}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {hasChanges ? "Allow with Changes" : "Allow"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Tool Denied - always collapsed/compact
function ToolDeniedBlock({ toolName, reason }: { toolName: string; reason: string }) {
  const shortName = getShortToolName(toolName)

  return (
    <div className={cn(CARD_HEIGHT, CARD_PADDING, "flex items-center justify-between gap-2 rounded-2xl bg-zinc-800/50 border border-zinc-700/50")}>
      <div className="flex items-center gap-2.5 min-w-0">
        <IconBox color="red">
          <X className="h-3.5 w-3.5 text-red-400" />
        </IconBox>
        <code className="text-xs font-medium text-zinc-300 font-mono truncate">{shortName}</code>
        <span className="text-[10px] text-zinc-500 truncate">{reason}</span>
      </div>
      <Badge className="h-5 gap-1 text-[9px] font-semibold uppercase tracking-wide px-1.5 border-0 leading-none bg-red-500/20 text-red-400 shrink-0">
        Denied
      </Badge>
    </div>
  )
}

// MCP Tool Block - collapsed by default
interface MCPToolBlockProps {
  name: string
  params: Record<string, unknown>
  result?: unknown
  hasResult: boolean
  onApproval?: (approved: boolean) => void
  approvalState?: boolean | null
}

function MCPToolBlock({ name, params, result, hasResult, onApproval, approvalState }: MCPToolBlockProps) {
  const shortName = getShortToolName(name)
  const needsApproval = isWriteOperation(name)
  const isPending = needsApproval && approvalState === null
  const isApproved = !needsApproval || approvalState === true
  const isDenied = approvalState === false

  // Auto-expand when approval is pending, otherwise collapsed
  const [isOpen, setIsOpen] = React.useState(isPending)

  // Auto-collapse after approval/denial
  React.useEffect(() => {
    if (!isPending && isOpen) {
      setIsOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-collapse on isPending change
  }, [isPending])

  // Get appropriate icon for this tool type
  const toolIcon = getToolIcon(name)
  const ToolIconComponent = toolIcon.icon

  // Icon color based on state
  const iconColor = isPending ? "amber" : isDenied ? "red" : "emerald"
  const iconTextColor = isPending ? "text-amber-400" : isDenied ? "text-red-400" : "text-emerald-400"

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-2xl overflow-hidden bg-zinc-800/50 border border-zinc-700/50">
        <CollapsibleTrigger asChild>
          <button className={cn(CARD_HEIGHT, CARD_PADDING, "w-full flex items-center justify-between gap-2 text-left hover:bg-zinc-700/50 transition-colors")}>
            <div className="flex items-center gap-2.5 min-w-0 h-full">
              <IconBox color={iconColor}>
                <ToolIconComponent className={cn("h-3.5 w-3.5", iconTextColor)} />
              </IconBox>
              <code className="text-xs font-medium text-zinc-100 font-mono truncate">{shortName}</code>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {needsApproval && (
                <Badge className={cn(
                  "h-5 gap-1 text-[9px] font-semibold uppercase tracking-wide px-1.5 border-0 leading-none",
                  isPending && "bg-amber-500/30 text-amber-300",
                  isApproved && "bg-emerald-500/20 text-emerald-400",
                  isDenied && "bg-red-500/20 text-red-400"
                )}>
                  {isPending && <Clock className="h-2.5 w-2.5" />}
                  {isApproved && <Check className="h-2.5 w-2.5" />}
                  {isDenied && <X className="h-2.5 w-2.5" />}
                  {isPending ? "Pending" : isApproved ? "Allowed" : "Denied"}
                </Badge>
              )}
              <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform duration-200", isOpen && "rotate-180")} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-2.5 border-t border-zinc-700/50 mt-1">
            <JsonDisplay title="Request" content={params} maxHeight="140px" collapsed={1} />
            {hasResult && isApproved && (
              <JsonDisplay title="Response" content={result} maxHeight="200px" collapsed={2} />
            )}
            {isDenied && (
              <div className="flex items-center gap-2 px-2.5 py-2 rounded bg-red-500/10 border border-red-500/20">
                <X className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[11px] text-red-300">Execution denied by user</span>
              </div>
            )}
            {isPending && onApproval && (
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-700/30">
                <p className="text-[10px] text-zinc-500">Approval required</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-[11px] text-zinc-300 hover:text-white hover:bg-red-500/80"
                    onClick={(e) => { e.stopPropagation(); onApproval(false) }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Deny
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                    onClick={(e) => { e.stopPropagation(); onApproval(true) }}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Allow
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Activity summary block
function ActivitySummaryBlock({ events, children }: { events: StreamEventItem[], children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const toolEvents = events.filter(e => e.type === "tool")
  const stepCount = toolEvents.length

  if (stepCount === 0) return <>{children}</>

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/50 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className={cn(CARD_HEIGHT, CARD_PADDING, "w-full flex items-center justify-between gap-2 text-left hover:bg-zinc-700/50 transition-colors")}>
            <div className="flex items-center gap-2.5 h-full">
              <IconBox color="zinc">
                <Terminal className="h-3.5 w-3.5 text-zinc-300" />
              </IconBox>
              <span className="text-xs text-zinc-200">
                <span className="font-medium">{stepCount}</span>
                <span className="text-zinc-400 ml-1">{stepCount === 1 ? 'tool call' : 'tool calls'}</span>
              </span>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-2 border-t border-zinc-700/50 mt-1">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Message Actions
function MessageActions({ content, messageId: _messageId }: { content: string; messageId: string }) {
  const [copied, setCopied] = React.useState(false)
  const [liked, setLiked] = React.useState(false)
  const [disliked, setDisliked] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleCopy} className={cn("p-1.5 rounded-lg transition-colors", copied ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800")}>
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">{copied ? "Copied!" : "Copy"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => { setLiked(!liked); if (!liked && disliked) setDisliked(false) }} className={cn("p-1.5 rounded-lg transition-colors", liked ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800")}>
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">{liked ? "Liked" : "Like"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => { setDisliked(!disliked); if (!disliked && liked) setLiked(false) }} className={cn("p-1.5 rounded-lg transition-colors", disliked ? "text-red-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800")}>
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">{disliked ? "Disliked" : "Dislike"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

// Convert legacy message format to events
function getEventsFromMessage(message: Message): StreamEventItem[] {
  if (message.events && message.events.length > 0) return message.events
  const events: StreamEventItem[] = []
  if (message.thinking) events.push({ type: "thinking", content: message.thinking })
  if (message.toolCalls) {
    message.toolCalls.forEach((tool, i) => {
      events.push({ type: "tool", name: tool.name, params: tool.params })
      const result = message.toolResults?.[i]
      if (result) events.push({ type: "tool_result", name: result.name, result: result.result })
    })
  }
  return events
}

export function AssistantMessage({ message, onToolApproval, pendingApprovals = new Map(), isStreaming = false }: AssistantMessageProps) {
  const events = getEventsFromMessage(message)
  const { displayMode } = useChatSettings()

  const [localApprovals, setLocalApprovals] = React.useState<Map<string, boolean | null>>(new Map())

  const handleApproval = (toolName: string, approved: boolean) => {
    if (onToolApproval) onToolApproval(toolName, approved)
    else setLocalApprovals(prev => new Map(prev).set(toolName, approved))
  }

  const getApprovalState = (toolName: string): boolean | null => {
    if (pendingApprovals.has(toolName)) return pendingApprovals.get(toolName) ?? null
    if (localApprovals.has(toolName)) return localApprovals.get(toolName) ?? null
    return isWriteOperation(toolName) ? null : true
  }

  // Collect approved/denied tool names
  const approvedToolNames = new Set<string>()
  const deniedToolNames = new Set<string>()
  for (const event of events) {
    if (event.type === "tool" && event.approved === true) approvedToolNames.add(event.name)
    if (event.type === "tool_denied") deniedToolNames.add(event.tool_name)
  }

  // Process events
  const processedEvents: Array<
    | { type: "routing"; service: string; capability: string; thinking?: string; key: string }
    | { type: "thinking"; content: string; key: string }
    | { type: "tool_group"; tool: { name: string; params: Record<string, unknown>; approved?: boolean }; result?: unknown; key: string }
    | { type: "tool_approval_required"; approval_id: string; tool_name: string; tool_input: string; parameter_schema?: RJSFSchema; key: string }
    | { type: "tool_denied"; tool_name: string; reason: string; key: string }
  > = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (event.type === "routing") processedEvents.push({ ...event, key: `routing-${i}` })
    else if (event.type === "thinking") processedEvents.push({ ...event, key: `thinking-${i}` })
    else if (event.type === "tool_approval_required") {
      if (!approvedToolNames.has(event.tool_name) && !deniedToolNames.has(event.tool_name)) {
        processedEvents.push({ ...event, key: `approval-${i}` })
      }
    } else if (event.type === "tool_denied") processedEvents.push({ ...event, key: `denied-${i}` })
    else if (event.type === "tool") {
      const nextEvent = events[i + 1]
      const toolGroup: typeof processedEvents[number] & { type: "tool_group" } = {
        type: "tool_group",
        tool: { name: event.name, params: event.params, approved: event.approved },
        key: `tool-${i}`
      }
      if (nextEvent?.type === "tool_result" && nextEvent.name === event.name) {
        toolGroup.result = nextEvent.result
        i++
      }
      processedEvents.push(toolGroup)
    }
  }

  const toolGroups = processedEvents.filter(e => e.type === "tool_group")

  return (
    <div className="flex gap-2.5 group">
      {/* Agent Avatar - matches h-10 message height */}
      {/* Agent Avatar hidden */}

      {/* Content - limited width for chat bubble feel */}
      <div className="flex-1 min-w-0 max-w-[85%] space-y-2">
        {/* Agent Name */}
        {message.agentName && (
          <Badge className="gap-1.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            {message.agentName}
          </Badge>
        )}

        {/* Events */}
        {displayMode === "compact" ? (
          <>
            {/* Compact mode: Hide thinking blocks, hide routing reasoning, only show essential events */}
            {processedEvents.filter(e => e.type !== "tool_group" && e.type !== "thinking").map((event) => {
              if (event.type === "routing") return <RoutingBlock key={event.key} service={event.service} capability={event.capability} thinking={undefined} />
              if (event.type === "tool_approval_required") {
                const approvalState = pendingApprovals.get(event.approval_id)
                const isPending = approvalState === undefined || approvalState === null
                return <ToolApprovalBlock key={event.key} approvalId={event.approval_id} toolName={event.tool_name} toolInput={event.tool_input} parameterSchema={event.parameter_schema} onApproval={(approved, modifiedParams) => onToolApproval?.(event.approval_id, approved, modifiedParams)} isPending={isPending} />
              }
              if (event.type === "tool_denied") return <ToolDeniedBlock key={event.key} toolName={event.tool_name} reason={event.reason} />
              return null
            })}
            {toolGroups.length > 0 && (
              <ActivitySummaryBlock events={events}>
                {toolGroups.map((group) => group.type === "tool_group" && (
                  <MCPToolBlock key={group.key} name={group.tool.name} params={group.tool.params} result={group.result} hasResult={group.result !== undefined} onApproval={(approved) => handleApproval(group.tool.name, approved)} approvalState={group.tool.approved === true ? true : getApprovalState(group.tool.name)} />
                ))}
              </ActivitySummaryBlock>
            )}
          </>
        ) : (
          processedEvents.map((event) => {
            if (event.type === "routing") return <RoutingBlock key={event.key} service={event.service} capability={event.capability} thinking={event.thinking} />
            if (event.type === "thinking") return <ThinkingBlock key={event.key} content={event.content} />
            if (event.type === "tool_approval_required") {
              const approvalState = pendingApprovals.get(event.approval_id)
              const isPending = approvalState === undefined || approvalState === null
              return <ToolApprovalBlock key={event.key} approvalId={event.approval_id} toolName={event.tool_name} toolInput={event.tool_input} parameterSchema={event.parameter_schema} onApproval={(approved, modifiedParams) => onToolApproval?.(event.approval_id, approved, modifiedParams)} isPending={isPending} />
            }
            if (event.type === "tool_denied") return <ToolDeniedBlock key={event.key} toolName={event.tool_name} reason={event.reason} />
            if (event.type === "tool_group") return <MCPToolBlock key={event.key} name={event.tool.name} params={event.tool.params} result={event.result} hasResult={event.result !== undefined} onApproval={(approved) => handleApproval(event.tool.name, approved)} approvalState={event.tool.approved === true ? true : getApprovalState(event.tool.name)} />
            return null
          })
        )}

        {/* Final Content - Markdown rendered (show while streaming with cursor) */}
        {(message.content || isStreaming) && (
          <div className="space-y-2 mt-4">
            <div>
              <div className="pl-1">
                <div className={cn(
                  "prose prose-invert max-w-none",
                  "text-sm leading-relaxed text-zinc-200",
                  // Headings - clear hierarchy
                  "prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:tracking-tight",
                  "prose-h1:text-xl prose-h1:mt-4 prose-h1:mb-2 prose-h1:border-b prose-h1:border-zinc-700/50 prose-h1:pb-2",
                  "prose-h2:text-lg prose-h2:mt-4 prose-h2:mb-2",
                  "prose-h3:text-base prose-h3:mt-3 prose-h3:mb-1.5",
                  // Paragraphs
                  "prose-p:my-2 prose-p:leading-relaxed",
                  // Lists
                  "prose-ul:my-2 prose-ul:pl-4",
                  "prose-ol:my-2 prose-ol:pl-4",
                  "prose-li:my-0.5 prose-li:marker:text-zinc-500",
                  // Code
                  "prose-code:bg-zinc-700/60 prose-code:text-emerald-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal",
                  "prose-code:before:content-none prose-code:after:content-none",
                  "prose-pre:bg-zinc-900/80 prose-pre:border prose-pre:border-zinc-700/50 prose-pre:rounded-xl prose-pre:text-zinc-300",
                  // Strong/emphasis
                  "prose-strong:text-zinc-100 prose-strong:font-semibold",
                  "prose-em:text-zinc-300",
                  // Links
                  "prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline",
                  // Blockquotes
                  "prose-blockquote:border-l-violet-500/50 prose-blockquote:bg-zinc-800/50 prose-blockquote:rounded-r prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:not-italic prose-blockquote:text-zinc-300",
                  // Tables
                  "prose-table:border prose-table:border-zinc-700/50",
                  "prose-th:bg-zinc-800 prose-th:px-3 prose-th:py-2 prose-th:text-zinc-200 prose-th:font-medium",
                  "prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-zinc-700/50"
                )}>
                  {message.content ? (
                    <>
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                        {message.content}
                      </ReactMarkdown>
                      {/* Streaming cursor - shown after content */}
                      {isStreaming && (
                        <span className="inline-block w-2 h-4 ml-0.5 bg-violet-400 animate-pulse rounded-sm" aria-label="Streaming response" />
                      )}
                    </>
                  ) : isStreaming ? (
                    /* Shimmering thinking indicator - shown before any content arrives */
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-zinc-400 animate-pulse">Thinking...</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            {!isStreaming && message.content && (
              <MessageActions content={message.content} messageId={message.id} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
