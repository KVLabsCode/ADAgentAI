"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Bot, Brain, ChevronDown, ChevronUp, Clock, Check, X, Route, Zap, Terminal, Copy, ThumbsUp, ThumbsDown, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useChatSettings } from "@/lib/chat-settings"
import type { Message, StreamEventItem } from "@/lib/types"

interface AssistantMessageProps {
  message: Message
  onToolApproval?: (toolName: string, approved: boolean) => void
  pendingApprovals?: Map<string, boolean | null>
}

// Check if a tool is a write/dangerous operation that needs approval
function isWriteOperation(toolName: string): boolean {
  const writePatterns = [
    "create", "update", "delete", "write", "post", "put", "patch",
    "remove", "add", "set", "modify", "insert", "save", "upload",
    "send", "submit", "execute", "run", "apply"
  ]
  const lowerName = toolName.toLowerCase()
  return writePatterns.some(pattern => lowerName.includes(pattern))
}

// Extract short tool name from full MCP tool path
function getShortToolName(fullName: string): string {
  // Handle patterns like "mcp__server__tool_name" or just "tool_name"
  const parts = fullName.split("__")
  return parts[parts.length - 1] || fullName
}

// Syntax highlighting for JSON
function highlightJSON(obj: unknown): React.ReactNode {
  const json = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2)

  // Simple syntax highlighting
  const highlighted = json
    .replace(/"([^"]+)":/g, '<span class="text-cyan-400">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span class="text-amber-300">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="text-purple-400">$1</span>')
    .replace(/: (true|false)/g, ': <span class="text-pink-400">$1</span>')
    .replace(/: (null)/g, ': <span class="text-gray-500">$1</span>')

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />
}

// Code block component with dark theme
function CodeBlock({
  title,
  content,
  maxHeight = "200px",
  className
}: {
  title: string
  content: unknown
  maxHeight?: string
  className?: string
}) {
  const formattedContent = typeof content === "string"
    ? content
    : JSON.stringify(content, null, 2)

  return (
    <div className={cn("rounded-lg overflow-hidden", className)}>
      <div className="bg-zinc-800 dark:bg-zinc-900 px-3 py-1.5 border-b border-zinc-700/50">
        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <ScrollArea className={`bg-zinc-900 dark:bg-zinc-950`} style={{ maxHeight }}>
        <pre className="p-3 text-[12px] leading-relaxed font-mono text-zinc-300 whitespace-pre-wrap break-all">
          {highlightJSON(content)}
        </pre>
      </ScrollArea>
    </div>
  )
}

// Routing block - shows the router decision with solid background
function RoutingBlock({ service, capability }: { service: string; capability: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-violet-600 dark:bg-violet-700 shadow-sm">
      <Route className="h-4 w-4 text-violet-100" />
      <span className="text-xs text-white">
        <span className="text-violet-200">Routing to</span>{" "}
        <span className="font-semibold">{service}</span>
        <span className="mx-2 text-violet-300">→</span>
        <span className="font-semibold">{capability}</span>
      </span>
    </div>
  )
}

// Thinking block with solid background
function ThinkingBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg bg-amber-600 dark:bg-amber-700 shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-amber-500 dark:hover:bg-amber-600 transition-colors">
            <Brain className="h-4 w-4 text-amber-100" />
            <span className="text-xs font-semibold text-white flex-1">
              Thinking...
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 text-amber-200 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3.5 pb-3 pt-0">
            <div className="bg-amber-700/50 dark:bg-amber-800/50 rounded-md p-3 mt-2">
              <p className="text-xs text-amber-50 whitespace-pre-wrap leading-relaxed">
                {content}
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// MCP Tool Block - Combined tool call and result with Request/Response design
interface MCPToolBlockProps {
  name: string
  params: Record<string, unknown>
  result?: unknown
  hasResult: boolean
  onApproval?: (approved: boolean) => void
  approvalState?: boolean | null // null = pending, true = approved, false = denied
}

function MCPToolBlock({
  name,
  params,
  result,
  hasResult,
  onApproval,
  approvalState
}: MCPToolBlockProps) {
  const [isOpen, setIsOpen] = React.useState(true)
  const shortName = getShortToolName(name)
  const needsApproval = isWriteOperation(name)
  const isPending = needsApproval && approvalState === null
  const isApproved = !needsApproval || approvalState === true
  const isDenied = approvalState === false

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-xl overflow-hidden transition-all duration-200 shadow-sm",
        isPending
          ? "bg-amber-600 dark:bg-amber-700"
          : isDenied
            ? "bg-red-600 dark:bg-red-700"
            : "bg-slate-700 dark:bg-slate-800"
      )}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className={cn(
            "w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-colors",
            isPending
              ? "hover:bg-amber-500 dark:hover:bg-amber-600"
              : isDenied
                ? "hover:bg-red-500 dark:hover:bg-red-600"
                : "hover:bg-slate-600 dark:hover:bg-slate-700"
          )}>
            {/* Tool Icon */}
            <div className={cn(
              "flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg shrink-0",
              isPending
                ? "bg-amber-700/50"
                : isDenied
                  ? "bg-red-700/50"
                  : "bg-emerald-600"
            )}>
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>

            {/* Tool Name */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <code className="text-xs sm:text-sm font-semibold text-white font-mono truncate block">
                {shortName}
              </code>
              {name !== shortName && (
                <p className={cn(
                  "text-[9px] sm:text-[10px] font-mono truncate mt-0.5",
                  isPending ? "text-amber-200" : isDenied ? "text-red-200" : "text-slate-300"
                )}>
                  {name}
                </p>
              )}
            </div>

            {/* Status Badge */}
            {needsApproval && (
              <Badge
                className={cn(
                  "h-5 sm:h-6 gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide shrink-0 px-1.5 sm:px-2 border-0",
                  isPending && "bg-amber-800 text-amber-100",
                  isApproved && "bg-emerald-600 text-white",
                  isDenied && "bg-red-800 text-red-100"
                )}
              >
                {isPending && <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                {isApproved && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                {isDenied && <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                <span className="hidden xs:inline">{isPending ? "Awaiting" : isApproved ? "Allowed" : "Denied"}</span>
              </Badge>
            )}

            {/* Expand/Collapse */}
            <ChevronUp className={cn(
              "h-4 w-4 transition-transform duration-200 shrink-0",
              isPending ? "text-amber-200" : isDenied ? "text-red-200" : "text-slate-300",
              !isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2.5 sm:space-y-3">
            {/* Request Block */}
            <CodeBlock
              title="Request"
              content={params}
              maxHeight="150px"
            />

            {/* Response Block - only show if we have result and approved */}
            {hasResult && isApproved && (
              <CodeBlock
                title="Response"
                content={result}
                maxHeight="200px"
              />
            )}

            {/* Denied Message */}
            {isDenied && (
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-red-800">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-200 shrink-0" />
                <span className="text-[11px] sm:text-xs text-red-100">Tool execution was denied</span>
              </div>
            )}

            {/* Approval Buttons */}
            {isPending && onApproval && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pt-2 border-t border-amber-500/30">
                <p className="text-[10px] sm:text-[11px] text-amber-200">
                  Approval required to proceed
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs text-amber-100 hover:text-white hover:bg-red-600 flex-1 sm:flex-none"
                    onClick={(e) => {
                      e.stopPropagation()
                      onApproval(false)
                    }}
                  >
                    <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                    Deny
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 sm:h-8 px-3 sm:px-4 text-[11px] sm:text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex-1 sm:flex-none"
                    onClick={(e) => {
                      e.stopPropagation()
                      onApproval(true)
                    }}
                  >
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
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

// Activity summary block - shows step count and quick overview with solid background
function ActivitySummaryBlock({ events, children }: { events: StreamEventItem[], children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true)

  const toolEvents = events.filter(e => e.type === "tool")
  const stepCount = toolEvents.length

  if (stepCount === 0) {
    return <>{children}</>
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl bg-zinc-700 dark:bg-zinc-800 overflow-hidden shadow-sm">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-600 dark:hover:bg-zinc-700 transition-colors">
            <Terminal className="h-4 w-4 text-zinc-200" />
            <span className="text-sm text-white flex-1">
              <span className="font-semibold">{stepCount}</span>
              <span className="text-zinc-300 ml-1">{stepCount === 1 ? 'step' : 'steps'}</span>
            </span>
            <ChevronUp className={cn(
              "h-4 w-4 text-zinc-300 transition-transform duration-200",
              !isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Message Actions - copy, like, dislike buttons shown on hover
interface MessageActionsProps {
  content: string
  messageId: string
  onLike?: (liked: boolean) => void
  onDislike?: (disliked: boolean) => void
}

function MessageActions({ content, messageId, onLike, onDislike }: MessageActionsProps) {
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

  const handleLike = () => {
    const newState = !liked
    setLiked(newState)
    if (newState && disliked) setDisliked(false)
    onLike?.(newState)
  }

  const handleDislike = () => {
    const newState = !disliked
    setDisliked(newState)
    if (newState && liked) setLiked(false)
    onDislike?.(newState)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopy}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                copied
                  ? "text-emerald-500"
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
              )}
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {copied ? "Copied!" : "Copy message"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleLike}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                liked
                  ? "text-emerald-500"
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
              )}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {liked ? "Liked" : "Like response"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleDislike}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                disliked
                  ? "text-red-500"
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
              )}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {disliked ? "Disliked" : "Dislike response"}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

// Convert legacy message format to events
function getEventsFromMessage(message: Message): StreamEventItem[] {
  if (message.events && message.events.length > 0) {
    return message.events
  }

  const events: StreamEventItem[] = []

  if (message.thinking) {
    events.push({ type: "thinking", content: message.thinking })
  }

  if (message.toolCalls) {
    message.toolCalls.forEach((tool, i) => {
      events.push({ type: "tool", name: tool.name, params: tool.params })
      const result = message.toolResults?.[i]
      if (result) {
        events.push({ type: "tool_result", name: result.name, result: result.result })
      }
    })
  }

  return events
}

// Group tool calls with their results
function groupToolEvents(events: StreamEventItem[]): Array<{
  tool: { name: string; params: Record<string, unknown> }
  result?: unknown
}> {
  const groups: Array<{ tool: { name: string; params: Record<string, unknown> }; result?: unknown }> = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (event.type === "tool") {
      const group: { tool: { name: string; params: Record<string, unknown> }; result?: unknown } = {
        tool: { name: event.name, params: event.params }
      }

      // Look for matching result
      const nextEvent = events[i + 1]
      if (nextEvent?.type === "tool_result" && nextEvent.name === event.name) {
        group.result = nextEvent.result
        i++ // Skip the result event
      }

      groups.push(group)
    }
  }

  return groups
}

export function AssistantMessage({
  message,
  onToolApproval,
  pendingApprovals = new Map()
}: AssistantMessageProps) {
  const events = getEventsFromMessage(message)
  const { displayMode } = useChatSettings()

  // Local approval state for tools without external management
  const [localApprovals, setLocalApprovals] = React.useState<Map<string, boolean | null>>(new Map())

  const handleApproval = (toolName: string, approved: boolean) => {
    if (onToolApproval) {
      onToolApproval(toolName, approved)
    } else {
      setLocalApprovals(prev => new Map(prev).set(toolName, approved))
    }
  }

  const getApprovalState = (toolName: string): boolean | null => {
    if (pendingApprovals.has(toolName)) {
      return pendingApprovals.get(toolName) ?? null
    }
    if (localApprovals.has(toolName)) {
      return localApprovals.get(toolName) ?? null
    }
    // Default: non-write operations are auto-approved
    return isWriteOperation(toolName) ? null : true
  }

  // Separate events by type
  const routingEvents = events.filter(e => e.type === "routing") as Array<{ type: "routing"; service: string; capability: string }>
  const thinkingEvents = events.filter(e => e.type === "thinking") as Array<{ type: "thinking"; content: string }>
  const toolGroups = groupToolEvents(events)

  return (
    <div className="flex gap-3 group">
      {/* Agent Avatar - Solid violet, no gradient */}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-md">
        <Bot className="h-4 w-4 text-white" />
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* Agent Name Badge */}
        {message.agentName && (
          <Badge className="gap-1.5 bg-violet-600 text-white border-0 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-300 animate-pulse" />
            {message.agentName}
          </Badge>
        )}

        {/* Routing Events */}
        {routingEvents.map((event, i) => (
          <RoutingBlock key={`routing-${i}`} service={event.service} capability={event.capability} />
        ))}

        {/* Thinking Events */}
        {thinkingEvents.map((event, i) => (
          <ThinkingBlock key={`thinking-${i}`} content={event.content} />
        ))}

        {/* Tool Events - Wrapped in Activity Summary */}
        {toolGroups.length > 0 && (
          displayMode === "compact" ? (
            <ActivitySummaryBlock events={events}>
              {toolGroups.map((group, i) => (
                <MCPToolBlock
                  key={`tool-${i}`}
                  name={group.tool.name}
                  params={group.tool.params}
                  result={group.result}
                  hasResult={group.result !== undefined}
                  onApproval={(approved) => handleApproval(group.tool.name, approved)}
                  approvalState={getApprovalState(group.tool.name)}
                />
              ))}
            </ActivitySummaryBlock>
          ) : (
            <div className="space-y-3">
              {toolGroups.map((group, i) => (
                <MCPToolBlock
                  key={`tool-${i}`}
                  name={group.tool.name}
                  params={group.tool.params}
                  result={group.result}
                  hasResult={group.result !== undefined}
                  onApproval={(approved) => handleApproval(group.tool.name, approved)}
                  approvalState={getApprovalState(group.tool.name)}
                />
              ))}
            </div>
          )
        )}

        {/* Final Content - Speech Bubble with improved contrast */}
        {message.content && (
          <div className="space-y-2">
            <div className={cn(
              "relative inline-block max-w-[95%]",
              // Light theme: solid light gray background
              // Dark theme: solid dark background
              "bg-slate-100 dark:bg-zinc-800",
              "rounded-2xl rounded-tl-md",
              "px-4 py-3",
              "shadow-sm"
            )}>
              <div className={cn(
                "prose prose-sm max-w-none text-[13px] leading-relaxed",
                // Light theme prose colors
                "prose-p:my-3 prose-p:leading-relaxed",
                "prose-pre:bg-slate-200 dark:prose-pre:bg-zinc-900",
                "prose-pre:text-slate-700 dark:prose-pre:text-zinc-300 prose-pre:text-xs",
                "prose-code:bg-slate-200 dark:prose-code:bg-zinc-700",
                "prose-code:text-violet-700 dark:prose-code:text-emerald-400",
                "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-normal",
                "prose-code:before:content-none prose-code:after:content-none",
                "prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2",
                "prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5",
                "prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5",
                "prose-li:my-1",
                "prose-strong:text-slate-800 dark:prose-strong:text-zinc-200",
                "text-slate-700 dark:text-zinc-200"
              )}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Message Actions - shown on hover */}
            <MessageActions content={message.content} messageId={message.id} />
          </div>
        )}
      </div>
    </div>
  )
}
