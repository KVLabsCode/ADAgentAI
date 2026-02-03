"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Bot, ChevronDown, Clock, Check, X, AlertTriangle, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/atoms/button"
import { Badge } from "@/atoms/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/molecules/collapsible"
import { useChatSettings } from "@/lib/chat-settings"
import type { Message, StreamEventItem, RJSFSchema, ActionRequiredType } from "@/lib/types"
import { RJSFParameterForm } from "./rjsf"
import { StepsTimeline } from "./steps-timeline"
import { FinalAnswerBlock } from "./final-answer-block"
import { Tool } from "@/organisms/tool"
import { Loader } from "@/components/ui/loader"

// Import extracted components
import {
  // Constants
  CARD_HEIGHT,
  CARD_PADDING,
  // Utils
  getShortToolName,
  getToolMetadata,
  isWriteOperation,
  getToolIcon,
  // Components
  IconBox,
  RoutingBlock,
  ThinkingBlock,
  MessageActions,
  JsonDisplay,
  ToolDeniedBlock,
  ActionRequiredBlock,
  ActivitySummaryBlock,
} from "./assistant-message/index"

// =============================================================================
// Types
// =============================================================================

interface AssistantMessageProps {
  message: Message
  onToolApproval?: (approvalId: string, approved: boolean, modifiedParams?: Record<string, unknown>) => void
  pendingApprovals?: Map<string, boolean | null>
  isStreaming?: boolean
}

// =============================================================================
// Agent Response Block
// =============================================================================

interface AgentResponseBlockProps {
  content: string
  isStreaming?: boolean
  messageId: string
}

const AgentResponseBlock = React.memo(function AgentResponseBlock({
  content,
  isStreaming,
  messageId,
}: AgentResponseBlockProps) {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50">
        <CollapsibleTrigger
          render={
            <button className={cn(CARD_HEIGHT, CARD_PADDING, "w-full flex items-center justify-between gap-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors")} />
          }
        >
          <div className="flex items-center gap-2.5">
            <IconBox color="violet">
              <Bot className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </IconBox>
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-200">
              {isStreaming ? "Responding..." : "Response"}
            </span>
            {isStreaming && (
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
            )}
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 border-t border-zinc-200 dark:border-zinc-700/50">
            <div className={cn(
              "prose dark:prose-invert max-w-none",
              "text-sm leading-relaxed text-zinc-900 dark:text-zinc-200",
              "prose-headings:text-zinc-950 dark:prose-headings:text-zinc-100 prose-headings:font-semibold prose-headings:tracking-tight",
              "prose-h1:text-xl prose-h1:mt-4 prose-h1:mb-2 prose-h1:border-b prose-h1:border-zinc-200 dark:prose-h1:border-zinc-700/50 prose-h1:pb-2",
              "prose-h2:text-lg prose-h2:mt-4 prose-h2:mb-2",
              "prose-h3:text-base prose-h3:mt-3 prose-h3:mb-1.5",
              "prose-p:my-2 prose-p:leading-relaxed",
              "prose-ul:my-2 prose-ul:pl-4",
              "prose-ol:my-2 prose-ol:pl-4",
              "prose-li:my-0.5 prose-li:marker:text-zinc-500",
              "prose-code:bg-zinc-100 dark:prose-code:bg-zinc-700/60 prose-code:text-emerald-600 dark:prose-code:text-emerald-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal",
              "prose-code:before:content-none prose-code:after:content-none",
              "prose-pre:bg-zinc-50 dark:prose-pre:bg-zinc-900/80 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-700/50 prose-pre:rounded-xl prose-pre:text-zinc-900 dark:prose-pre:text-zinc-300",
              "prose-strong:text-zinc-950 dark:prose-strong:text-zinc-100 prose-strong:font-semibold",
              "prose-em:text-zinc-800 dark:prose-em:text-zinc-300",
              "prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline",
              "prose-blockquote:border-l-violet-500/50 prose-blockquote:bg-white dark:prose-blockquote:bg-zinc-800/50 prose-blockquote:rounded-r prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:not-italic prose-blockquote:text-zinc-700 dark:prose-blockquote:text-zinc-300",
              "prose-table:border prose-table:border-zinc-200 dark:prose-table:border-zinc-700/50",
              "prose-th:bg-zinc-50 dark:prose-th:bg-zinc-800 prose-th:px-3 prose-th:py-2 prose-th:text-zinc-900 dark:prose-th:text-zinc-200 prose-th:font-medium",
              "prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-zinc-200 dark:prose-td:border-zinc-700/50"
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-violet-400 animate-pulse rounded-sm" aria-label="Streaming response" />
              )}
            </div>
            {!isStreaming && content && (
              <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700/30">
                <MessageActions content={content} messageId={messageId} />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
})

// =============================================================================
// Tool Approval Block
// =============================================================================

interface ToolApprovalBlockProps {
  approvalId: string
  toolName: string
  toolInput: string
  parameterSchema?: RJSFSchema
  onApproval: (approved: boolean, modifiedParams?: Record<string, unknown>) => void
  isPending: boolean
  isExecuting?: boolean
  isDenied?: boolean
}

const ToolApprovalBlock = React.memo(function ToolApprovalBlock({
  approvalId: _approvalId,
  toolName,
  toolInput,
  parameterSchema,
  onApproval,
  isPending,
  isExecuting = false,
  isDenied = false,
}: ToolApprovalBlockProps) {
  const metadata = React.useMemo(() => getToolMetadata(toolName), [toolName])

  const initialValues = React.useMemo(() => {
    try {
      const parsed = JSON.parse(toolInput) as Record<string, unknown>
      let values = parsed
      if (parsed.params && typeof parsed.params === "object") {
        values = parsed.params as Record<string, unknown>
      }
      if (values.targeting && typeof values.targeting === "object") {
        const targeting = values.targeting as Record<string, unknown>
        const { targeting: _, ...rest } = values
        values = {
          ...rest,
          platform: targeting.platform,
          ad_format: targeting.format,
          ad_unit_ids: targeting.ad_unit_ids,
        }
      }
      if (Array.isArray(values.ad_unit_ids)) {
        values = {
          ...values,
          ad_unit_ids: (values.ad_unit_ids as string[]).join(", ")
        }
      }
      return values
    } catch {
      return {}
    }
  }, [toolInput])

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

  const toolState = isPending ? "approval-pending" : isExecuting ? "input-streaming" : isDenied ? "output-error" : "output-available"
  const toolInput2 = parameterSchema && isPending ? undefined : initialValues

  const approvalButtons = isPending && (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[10px]">
        {metadata.riskLevel === "high" ? (
          <>
            <AlertTriangle className="h-3 w-3 text-red-400" />
            <span className="text-red-400 dark:text-red-300">This action may have significant impact</span>
          </>
        ) : (
          <>
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {hasErrors ? "Fill required fields" : hasChanges ? "Review changes" : "Approval required"}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-3 text-[11px] text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/80"
          onClick={(e) => { e.stopPropagation(); handleApproval(false) }}
        >
          <X className="h-3 w-3 mr-1" />
          Deny
        </Button>
        <Button
          size="sm"
          disabled={hasErrors}
          className={cn(
            "h-7 px-3 text-[11px]",
            hasErrors
              ? "bg-muted cursor-not-allowed opacity-50"
              : hasChanges
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
          )}
          onClick={(e) => { e.stopPropagation(); handleApproval(true) }}
        >
          <Check className="h-3 w-3 mr-1" />
          {hasChanges ? "Allow with Changes" : "Allow"}
        </Button>
      </div>
    </div>
  )

  return (
    <Tool
      toolPart={{
        type: metadata.displayName,
        state: toolState,
        input: toolInput2,
        errorText: isDenied ? "Execution denied" : undefined,
      }}
      defaultOpen={isPending || isExecuting}
      approvalContent={
        <>
          {parameterSchema && isPending && (
            <div className="mb-4">
              <RJSFParameterForm
                rjsfSchema={parameterSchema}
                initialValues={initialValues}
                onChange={handleParamChange}
                disabled={!isPending}
              />
            </div>
          )}
          {approvalButtons}
        </>
      }
    />
  )
})

// =============================================================================
// MCP Tool Block
// =============================================================================

interface MCPToolBlockProps {
  name: string
  params: Record<string, unknown>
  result?: unknown
  hasResult: boolean
  onApproval?: (approved: boolean) => void
  approvalState?: boolean | null
}

const MCPToolBlock = React.memo(function MCPToolBlock({
  name,
  params,
  result,
  hasResult,
  onApproval,
  approvalState,
}: MCPToolBlockProps) {
  const shortName = getShortToolName(name)
  const needsApproval = isWriteOperation(name)
  const isPending = needsApproval && approvalState === null
  const isApproved = !needsApproval || approvalState === true
  const isDenied = approvalState === false

  // Derived state pattern: isOpen is derived from isPending OR user preference
  const [userWantsOpen, setUserWantsOpen] = React.useState(false)
  const isOpen = isPending || userWantsOpen

  // Reset user preference when approval completes
  React.useEffect(() => {
    if (!isPending) {
      setUserWantsOpen(false)
    }
  }, [isPending])

  const toolIcon = getToolIcon(name)
  const ToolIconComponent = toolIcon.icon
  const iconColor = isPending ? "amber" : isDenied ? "red" : "emerald"
  const iconTextColor = isPending ? "text-amber-400" : isDenied ? "text-red-400" : "text-emerald-400"

  return (
    <Collapsible open={isOpen} onOpenChange={setUserWantsOpen}>
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50">
        <CollapsibleTrigger
          render={
            <button className={cn(CARD_HEIGHT, CARD_PADDING, "w-full flex items-center justify-between gap-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors")} />
          }
        >
          <div className="flex items-center gap-2.5 min-w-0 h-full">
            <IconBox color={iconColor}>
              <ToolIconComponent className={cn("h-3.5 w-3.5", iconTextColor)} />
            </IconBox>
            <code className="text-xs font-medium text-zinc-900 dark:text-zinc-100 font-mono truncate">{shortName}</code>
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
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-2.5 border-t border-zinc-200 dark:border-zinc-700/50 mt-1">
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
})

// =============================================================================
// Event Processing
// =============================================================================

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

// =============================================================================
// Main Component
// =============================================================================

export function AssistantMessage({
  message,
  onToolApproval,
  pendingApprovals = new Map(),
  isStreaming = false,
}: AssistantMessageProps) {
  const events = getEventsFromMessage(message)
  const { displayMode: _displayMode } = useChatSettings()

  const timelineEvents: StreamEventItem[] = events.filter(e =>
    e.type === "routing" ||
    e.type === "thinking" ||
    e.type === "content" ||
    e.type === "tool" ||
    e.type === "tool_result" ||
    e.type === "tool_approval_required" ||
    e.type === "tool_executing" ||
    e.type === "finished"
  )

  const hasPendingApproval = events.some(e => {
    if (e.type === "tool_approval_required") {
      const approvalState = pendingApprovals.get(e.approval_id)
      return approvalState === undefined || approvalState === null
    }
    return false
  })

  const deniedEvents = events.filter(e => e.type === "tool_denied") as Array<Extract<StreamEventItem, { type: "tool_denied" }>>
  const actionRequiredEvents = events.filter(e => e.type === "action_required") as Array<Extract<StreamEventItem, { type: "action_required" }>>

  let finalContent = ""
  for (const event of events) {
    if (event.type === "result") {
      finalContent = event.content
      break
    }
  }

  const hadToolCalls = events.some(e => e.type === "tool" || e.type === "tool_result")

  if (!finalContent && message.content && !isStreaming && !message.aborted && !hadToolCalls) {
    finalContent = message.content
  }

  return (
    <div className="flex gap-2.5 group" data-testid="assistant-message">
      <div className="flex-1 min-w-0 space-y-2">
        {isStreaming && timelineEvents.length === 0 && !message.content && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
            <Loader variant="circular" size="sm" className="text-muted-foreground" />
            <span>Analyzing your request...</span>
          </div>
        )}

        {timelineEvents.length > 0 && (
          <StepsTimeline
            events={timelineEvents}
            isStreaming={isStreaming}
            hasPendingApproval={hasPendingApproval}
            onToolApproval={onToolApproval}
            pendingApprovals={pendingApprovals}
          />
        )}

        {deniedEvents.map((event, idx) => (
          <ToolDeniedBlock
            key={`denied-${idx}`}
            toolName={event.tool_name}
            reason={event.reason}
          />
        ))}

        {actionRequiredEvents.map((event, idx) => (
          <ActionRequiredBlock
            key={`action-required-${idx}`}
            actionType={event.action_type}
            message={event.message}
            deepLink={event.deep_link}
            blocking={event.blocking}
            metadata={event.metadata}
          />
        ))}

        {isStreaming && message.content && timelineEvents.length === 0 && (
          <FinalAnswerBlock
            content={message.content}
            isStreaming={true}
            messageId={message.id}
          />
        )}

        {!isStreaming && finalContent && (
          <FinalAnswerBlock
            content={finalContent}
            isStreaming={false}
            messageId={message.id}
            className={timelineEvents.length > 0 ? "mt-8" : undefined}
          />
        )}

        {message.aborted && !finalContent && (
          <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50">
            <div className="w-2 h-2 rounded-full bg-zinc-400" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Response stopped
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Legacy Component (kept for backward compatibility)
// =============================================================================

export function AssistantMessageLegacy({
  message,
  onToolApproval,
  pendingApprovals = new Map(),
  isStreaming = false,
}: AssistantMessageProps) {
  const events = getEventsFromMessage(message)
  const { displayMode } = useChatSettings()

  const toolResultsByToolIndex = new Map<number, unknown>()
  const approvalIndicesWithResults = new Set<number>()
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (event.type === "tool_result") {
      for (let j = i - 1; j >= 0; j--) {
        const prevEvent = events[j]
        if (prevEvent.type === "tool" && prevEvent.name === event.name) {
          if (!toolResultsByToolIndex.has(j)) {
            toolResultsByToolIndex.set(j, event.result)
            break
          }
        }
      }
      for (let j = i - 1; j >= 0; j--) {
        const prevEvent = events[j]
        if (prevEvent.type === "tool_approval_required" && prevEvent.tool_name === event.name) {
          if (!approvalIndicesWithResults.has(j)) {
            approvalIndicesWithResults.add(j)
            break
          }
        }
      }
    }
  }

  const processedEvents: Array<
    | { type: "routing"; service: string; capability: string; thinking?: string; execution_path?: string; model_selected?: string; key: string }
    | { type: "thinking"; content: string; key: string }
    | { type: "content"; content: string; key: string }
    | { type: "tool_group"; tool: { name: string; params: Record<string, unknown>; approved?: boolean }; result?: unknown; key: string }
    | { type: "tool_approval_required"; approval_id: string; tool_name: string; tool_input: string; parameter_schema?: RJSFSchema; key: string }
    | { type: "tool_denied"; tool_name: string; reason: string; key: string }
    | { type: "action_required"; action_type: ActionRequiredType; message: string; deep_link?: string; blocking: boolean; metadata?: Record<string, unknown>; key: string }
  > = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (event.type === "routing") {
      processedEvents.push({ ...event, key: `routing-${i}` })
    }
    else if (event.type === "thinking") {
      processedEvents.push({ ...event, key: `thinking-${i}` })
    }
    else if (event.type === "content") {
      const lastEvent = processedEvents[processedEvents.length - 1]
      if (lastEvent?.type === "content") {
        lastEvent.content += event.content
      } else {
        processedEvents.push({ type: "content", content: event.content, key: `content-${i}` })
      }
    }
    else if (event.type === "tool_approval_required") {
      const approvalState = pendingApprovals.get(event.approval_id)
      const hasToolResult = approvalIndicesWithResults.has(i)
      const hasDeniedEvent = events.some((e, idx) => idx > i && e.type === "tool_denied" && e.tool_name === event.tool_name)
      const isPending = approvalState === undefined || approvalState === null
      const isExecuting = approvalState === true && !hasToolResult
      const isDenied = approvalState === false && !hasDeniedEvent
      const alreadyHasApproval = processedEvents.some(e => e.type === "tool_approval_required")

      if ((isPending || isExecuting || isDenied) && !alreadyHasApproval) {
        processedEvents.push({ ...event, key: `approval-${i}` })
      }
    } else if (event.type === "tool_denied") processedEvents.push({ ...event, key: `denied-${i}` })
    else if (event.type === "action_required") {
      processedEvents.push({ ...event, key: `action-required-${i}` })
    }
    else if (event.type === "tool") {
      const isDangerous = isWriteOperation(event.name)
      const hasResult = toolResultsByToolIndex.has(i)

      if (isDangerous && event.approved !== true) {
        continue
      }

      if (!hasResult) {
        continue
      }

      processedEvents.push({
        type: "tool_group",
        tool: { name: event.name, params: event.params, approved: event.approved },
        result: toolResultsByToolIndex.get(i),
        key: `tool-${i}`
      })
    }
  }

  const toolGroups = processedEvents.filter(e => e.type === "tool_group")

  return (
    <div className="flex gap-2.5 group" data-testid="assistant-message">
      <div className="flex-1 min-w-0 space-y-2">
        {displayMode === "compact" ? (
          <>
            {processedEvents.filter(e => e.type !== "tool_group" && e.type !== "thinking").map((event) => {
              if (event.type === "routing") return <RoutingBlock key={event.key} service={event.service} capability={event.capability} thinking={undefined} model_selected={event.model_selected} />
              if (event.type === "content") return (
                <AgentResponseBlock
                  key={event.key}
                  content={event.content}
                  isStreaming={false}
                  messageId={message.id}
                />
              )
              if (event.type === "tool_approval_required") {
                const approvalState = pendingApprovals.get(event.approval_id)
                const isPending = approvalState === undefined || approvalState === null
                const isExecuting = approvalState === true
                const isDenied = approvalState === false
                return <ToolApprovalBlock key={event.key} approvalId={event.approval_id} toolName={event.tool_name} toolInput={event.tool_input} parameterSchema={event.parameter_schema} onApproval={(approved, modifiedParams) => onToolApproval?.(event.approval_id, approved, modifiedParams)} isPending={isPending} isExecuting={isExecuting} isDenied={isDenied} />
              }
              if (event.type === "tool_denied") return <ToolDeniedBlock key={event.key} toolName={event.tool_name} reason={event.reason} />
              if (event.type === "action_required") return <ActionRequiredBlock key={event.key} actionType={event.action_type} message={event.message} deepLink={event.deep_link} blocking={event.blocking} metadata={event.metadata} />
              return null
            })}
            {toolGroups.length > 0 && (
              <ActivitySummaryBlock events={events}>
                {toolGroups.map((group) => group.type === "tool_group" && (
                  <MCPToolBlock
                    key={group.key}
                    name={group.tool.name}
                    params={group.tool.params}
                    result={group.result}
                    hasResult={group.result !== undefined}
                    approvalState={group.tool.approved === true ? true : null}
                  />
                ))}
              </ActivitySummaryBlock>
            )}
          </>
        ) : (
          processedEvents.map((event) => {
            if (event.type === "routing") return <RoutingBlock key={event.key} service={event.service} capability={event.capability} thinking={event.thinking} model_selected={event.model_selected} />
            if (event.type === "thinking") return <ThinkingBlock key={event.key} content={event.content} />
            if (event.type === "content") return (
              <AgentResponseBlock
                key={event.key}
                content={event.content}
                isStreaming={false}
                messageId={message.id}
              />
            )
            if (event.type === "tool_approval_required") {
              const approvalState = pendingApprovals.get(event.approval_id)
              const isPending = approvalState === undefined || approvalState === null
              const isExecuting = approvalState === true
              const isDenied = approvalState === false
              return <ToolApprovalBlock key={event.key} approvalId={event.approval_id} toolName={event.tool_name} toolInput={event.tool_input} parameterSchema={event.parameter_schema} onApproval={(approved, modifiedParams) => onToolApproval?.(event.approval_id, approved, modifiedParams)} isPending={isPending} isExecuting={isExecuting} isDenied={isDenied} />
            }
            if (event.type === "tool_denied") return <ToolDeniedBlock key={event.key} toolName={event.tool_name} reason={event.reason} />
            if (event.type === "action_required") return <ActionRequiredBlock key={event.key} actionType={event.action_type} message={event.message} deepLink={event.deep_link} blocking={event.blocking} metadata={event.metadata} />
            if (event.type === "tool_group") return (
              <MCPToolBlock
                key={event.key}
                name={event.tool.name}
                params={event.tool.params}
                result={event.result}
                hasResult={event.result !== undefined}
                approvalState={event.tool.approved === true ? true : null}
              />
            )
            return null
          })
        )}

        {!processedEvents.some(e => e.type === "content") && isStreaming && !message.content && (
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/50">
            <div className={cn(CARD_HEIGHT, CARD_PADDING, "flex items-center gap-2.5")}>
              <IconBox color="violet">
                <Bot className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </IconBox>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-zinc-400 animate-pulse">Responding...</span>
              </div>
            </div>
          </div>
        )}
        {!processedEvents.some(e => e.type === "content") && message.content && !isStreaming && (
          <AgentResponseBlock
            content={message.content}
            isStreaming={false}
            messageId={message.id}
          />
        )}
      </div>
    </div>
  )
}
