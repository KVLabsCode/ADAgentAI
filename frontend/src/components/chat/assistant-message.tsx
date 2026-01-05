"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { Bot, Brain, Wrench, CheckCircle2, ChevronDown, Clock, ShieldCheck, ShieldX } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useChatSettings } from "@/lib/chat-settings"
import type { Message, StreamEventItem } from "@/lib/types"

interface AssistantMessageProps {
  message: Message
}

// Convert single newlines to double newlines for markdown paragraph rendering
function normalizeNewlines(content: string): string {
  if (!content) return ""
  return content
    .replace(/\r\n/g, '\n')
    .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
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

type ApprovalStatus = "pending" | "approved" | "denied"

// Status badge component using shadcn Badge
function StatusBadge({ status }: { status: ApprovalStatus }) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="h-5 gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
    case "approved":
      return (
        <Badge variant="outline" className="h-5 gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="h-3 w-3" />
          Approved
        </Badge>
      )
    case "denied":
      return (
        <Badge variant="outline" className="h-5 gap-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
          <ShieldX className="h-3 w-3" />
          Denied
        </Badge>
      )
  }
}

// Thinking block using shadcn Collapsible
function ThinkingBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border transition-colors",
        "border-amber-200/60 dark:border-amber-800/50",
        "bg-gradient-to-r from-amber-50/80 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20"
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors rounded-lg">
            <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50">
              <Brain className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-amber-800 dark:text-amber-200 flex-1">
              Thinking...
            </span>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-amber-500/70 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3">
            <div className="pt-2 border-t border-amber-200/40 dark:border-amber-800/30">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {content}
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Tool call block using shadcn Collapsible with approval UI
function ToolBlock({ name, params }: { name: string; params: Record<string, unknown> }) {
  const needsApproval = isWriteOperation(name)
  const [isOpen, setIsOpen] = React.useState(needsApproval)
  const [approvalStatus, setApprovalStatus] = React.useState<ApprovalStatus>(
    needsApproval ? "pending" : "approved"
  )

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border transition-all",
        needsApproval && approvalStatus === "pending"
          ? "border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50/90 to-yellow-50/50 dark:from-amber-950/40 dark:to-yellow-950/20 shadow-sm shadow-amber-200/50 dark:shadow-amber-900/30"
          : "border-blue-200/60 dark:border-blue-800/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20"
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-blue-100/30 dark:hover:bg-blue-900/20 transition-colors rounded-lg">
            <div className={cn(
              "p-1 rounded-md",
              needsApproval && approvalStatus === "pending"
                ? "bg-amber-100 dark:bg-amber-900/50"
                : "bg-blue-100 dark:bg-blue-900/50"
            )}>
              <Wrench className={cn(
                "h-3 w-3",
                needsApproval && approvalStatus === "pending"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-blue-600 dark:text-blue-400"
              )} />
            </div>
            <code className="text-xs font-medium text-blue-800 dark:text-blue-200 truncate flex-1 font-mono">
              {name}
            </code>
            {needsApproval && <StatusBadge status={approvalStatus} />}
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-blue-500/70 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3">
            <div className="pt-2 border-t border-blue-200/40 dark:border-blue-800/30 space-y-3">
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Parameters
                </span>
                <pre className="mt-1.5 text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap bg-background/60 rounded-md p-2 border border-border/30">
                  {JSON.stringify(params, null, 2)}
                </pre>
              </div>

              {/* Approval buttons */}
              {needsApproval && approvalStatus === "pending" && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      setApprovalStatus("denied")
                    }}
                  >
                    <ShieldX className="h-3 w-3 mr-1.5" />
                    Deny
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    onClick={(e) => {
                      e.stopPropagation()
                      setApprovalStatus("approved")
                    }}
                  >
                    <ShieldCheck className="h-3 w-3 mr-1.5" />
                    Allow
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Tool result block using shadcn Collapsible
function ToolResultBlock({ name, result }: { name: string; result: unknown }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border transition-colors",
        "border-emerald-200/60 dark:border-emerald-800/50",
        "bg-gradient-to-r from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20"
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-emerald-100/30 dark:hover:bg-emerald-900/20 transition-colors rounded-lg">
            <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/50">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200 truncate flex-1">
              Result: <code className="font-mono">{name}</code>
            </span>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-emerald-500/70 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3">
            <div className="pt-2 border-t border-emerald-200/40 dark:border-emerald-800/30">
              <pre className="text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto bg-background/60 rounded-md p-2 border border-border/30">
                {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Compact activity block - combines all events into one collapsible
function CompactActivityBlock({ events }: { events: StreamEventItem[] }) {
  const [isOpen, setIsOpen] = React.useState(false)

  const thinkingCount = events.filter(e => e.type === "thinking").length
  const toolCount = events.filter(e => e.type === "tool").length
  const pendingApprovals = events.filter(
    e => e.type === "tool" && isWriteOperation(e.name)
  ).length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border transition-colors",
        "border-slate-200/60 dark:border-slate-700/50",
        "bg-gradient-to-r from-slate-50/80 to-gray-50/40 dark:from-slate-900/40 dark:to-gray-900/20"
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors rounded-lg">
            <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800">
              <Brain className="h-3 w-3 text-slate-600 dark:text-slate-400" />
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-1">
              {thinkingCount > 0 && `${thinkingCount} thinking`}
              {thinkingCount > 0 && toolCount > 0 && " · "}
              {toolCount > 0 && `${toolCount} tool${toolCount > 1 ? "s" : ""}`}
            </span>
            {pendingApprovals > 0 && (
              <Badge variant="outline" className="h-5 gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                <Clock className="h-3 w-3" />
                {pendingApprovals} pending
              </Badge>
            )}
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-slate-500/70 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3">
            <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/30 space-y-2">
              {events.map((event, i) => {
                if (event.type === "thinking") {
                  return (
                    <div key={`thinking-${i}`} className="text-xs">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium mb-1">
                        <Brain className="h-3 w-3" />
                        Thinking
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed pl-4">
                        {event.content}
                      </p>
                    </div>
                  )
                }
                if (event.type === "tool") {
                  return (
                    <div key={`tool-${i}`} className="text-xs flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                        <Wrench className="h-3 w-3" />
                        Tool:
                      </div>
                      <code className="font-mono text-blue-700 dark:text-blue-300">{event.name}</code>
                      {isWriteOperation(event.name) && (
                        <Badge variant="outline" className="h-4 text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                          needs approval
                        </Badge>
                      )}
                    </div>
                  )
                }
                if (event.type === "tool_result") {
                  return (
                    <div key={`result-${i}`} className="text-xs flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Result:
                      </div>
                      <code className="font-mono text-emerald-700 dark:text-emerald-300">{event.name}</code>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
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

export function AssistantMessage({ message }: AssistantMessageProps) {
  const events = getEventsFromMessage(message)
  const { displayMode } = useChatSettings()

  return (
    <div className="flex gap-3">
      {/* Agent Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
        <Bot className="h-4 w-4 text-white" />
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* Agent Name Badge */}
        {message.agentName && (
          <Badge variant="outline" className="gap-1.5 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            {message.agentName}
          </Badge>
        )}

        {/* Sequential Events - Detailed or Compact mode */}
        {events.length > 0 && (
          displayMode === "compact" ? (
            <CompactActivityBlock events={events} />
          ) : (
            <div className="space-y-2">
              {events.map((event, i) => {
                if (event.type === "thinking") {
                  return <ThinkingBlock key={`thinking-${i}`} content={event.content} />
                }
                if (event.type === "tool") {
                  return <ToolBlock key={`tool-${i}`} name={event.name} params={event.params} />
                }
                if (event.type === "tool_result") {
                  return <ToolResultBlock key={`result-${i}`} name={event.name} result={event.result} />
                }
                return null
              })}
            </div>
          )
        )}

        {/* Final Content - Speech Bubble */}
        {message.content && (
          <div className={cn(
            "relative inline-block max-w-[95%]",
            "bg-gradient-to-br from-muted/60 to-muted/30 dark:from-muted/40 dark:to-muted/20",
            "rounded-2xl rounded-tl-md",
            "px-4 py-3",
            "border border-border/30"
          )}>
            <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed prose-p:my-3 prose-p:leading-relaxed prose-pre:bg-background prose-pre:text-foreground prose-pre:text-xs prose-code:bg-background prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-strong:text-foreground [&_br]:block [&_br]:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {normalizeNewlines(message.content)}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
