"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Format content to ensure proper paragraph breaks
// Converts single newlines to double newlines for markdown paragraph rendering
function formatContentWithParagraphs(content: string): string {
  if (!content) return ""

  // Split by lines and group into paragraphs
  // Lines ending with : are headers, add blank line after
  // Consecutive lines without blank lines become separate paragraphs
  return content
    .split('\n')
    .map((line, i, arr) => {
      const trimmed = line.trim()
      // Add blank line after header-like lines (ending with :)
      if (trimmed.endsWith(':') && i < arr.length - 1 && arr[i + 1].trim()) {
        return line + '\n'
      }
      // Add blank line before lines that start with bold (section headers)
      if (trimmed.startsWith('**') && i > 0 && arr[i - 1].trim() && !arr[i - 1].trim().endsWith(':')) {
        return '\n' + line
      }
      return line
    })
    .join('\n')
}
import { Bot, Brain, Wrench, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Message, StreamEventItem } from "@/lib/types"

interface AssistantMessageProps {
  message: Message
}

// Thinking block - collapsible with subtle background
function ThinkingBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden cursor-pointer transition-colors",
        "border border-amber-200/40 dark:border-amber-800/40",
        "bg-amber-50/30 dark:bg-amber-950/20",
        "hover:bg-amber-50/50 dark:hover:bg-amber-950/30"
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Brain className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-1">
          Thinking...
        </span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3 text-amber-600/60 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-amber-600/60 shrink-0" />
        )}
      </div>
      {isOpen && (
        <div className="border-t border-amber-200/40 dark:border-amber-800/40 px-3 py-2 bg-background/50">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {content}
          </p>
        </div>
      )}
    </div>
  )
}

// Tool call block - shows tool name with expand for details
function ToolBlock({ name, params }: { name: string; params: Record<string, unknown> }) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div className="border border-blue-200/40 dark:border-blue-800/40 rounded-lg overflow-hidden bg-blue-50/30 dark:bg-blue-950/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
      >
        <Wrench className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <code className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate flex-1">{name}</code>
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-blue-600/60 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-blue-600/60 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-blue-200/40 dark:border-blue-800/40 px-3 py-2 bg-background/50">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Input</span>
          <pre className="text-[11px] text-muted-foreground mt-1 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(params, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Tool result block
function ToolResultBlock({ name, result }: { name: string; result: unknown }) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div className="border border-emerald-200/40 dark:border-emerald-800/40 rounded-lg overflow-hidden bg-emerald-50/30 dark:bg-emerald-950/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-emerald-100/30 dark:hover:bg-emerald-900/20 transition-colors"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate flex-1">
          Result: {name}
        </span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-emerald-600/60 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-emerald-600/60 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-emerald-200/40 dark:border-emerald-800/40 px-3 py-2 bg-background/50">
          <pre className="text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
            {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Convert legacy message format to events for backward compatibility
function getEventsFromMessage(message: Message): StreamEventItem[] {
  // If we have the new events array, use it
  if (message.events && message.events.length > 0) {
    return message.events
  }

  // Otherwise, convert legacy format to events
  const events: StreamEventItem[] = []

  // Add thinking as single event (legacy format stored all thinking together)
  if (message.thinking) {
    events.push({ type: "thinking", content: message.thinking })
  }

  // Interleave tool calls with their results
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

  return (
    <div className="flex gap-3">
      {/* Agent Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
        <Bot className="h-4 w-4 text-white" />
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* Agent Name - Badge style */}
        {message.agentName && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 border border-violet-200/50 dark:border-violet-700/50">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
              {message.agentName}
            </span>
          </div>
        )}

        {/* Sequential Events */}
        {events.length > 0 && (
          <div className="space-y-2.5">
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
        )}

        {/* Final Content - Speech Bubble */}
        {message.content && (
          <div
            className={cn(
              "relative inline-block max-w-[95%]",
              "bg-muted/50 dark:bg-muted/30",
              "rounded-2xl rounded-tl-sm",
              "px-4 py-2.5"
            )}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed prose-p:my-3 prose-p:leading-relaxed prose-pre:bg-background prose-pre:text-foreground prose-pre:text-xs prose-code:bg-background prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-strong:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {formatContentWithParagraphs(message.content)}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
