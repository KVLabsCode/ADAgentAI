"use client"

import * as React from "react"
import {
  GitBranch,
  Lightbulb,
  Search,
  FileSearch,
  Plus,
  Pencil,
  Trash2,
  Zap,
  MessageSquare,
  Check,
  X,
  Circle,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
} from "@/organisms/chain-of-thought"
import { Tool } from "@/organisms/tool"
import { TextShimmer } from "@/atoms/text-shimmer"
import { getStepInfo, extractMcpContent, type StepIconName } from "@/lib/step-utils"
import type { StreamEventItem } from "@/lib/types"

export interface TimelineStep {
  id: string
  icon: StepIconName
  label: string
  event: StreamEventItem
  toolResult?: unknown
}

interface StepsTimelineProps {
  events: StreamEventItem[]
  isStreaming?: boolean
  hasPendingApproval?: boolean
  className?: string
}

// Icon component map
const IconMap: Record<StepIconName, React.ComponentType<{ className?: string }>> = {
  GitBranch,
  Lightbulb,
  Search,
  FileSearch,
  Plus,
  Pencil,
  Trash2,
  Zap,
  MessageSquare,
  Check,
  X,
  Circle,
}

/**
 * Convert stream events to timeline steps
 */
function eventsToSteps(events: StreamEventItem[]): TimelineStep[] {
  const steps: TimelineStep[] = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    // Skip result-type events (they're paired with tool events)
    if (event.type === "tool_result") continue
    if (event.type === "tool_approval_required") continue
    if (event.type === "tool_denied") continue
    if (event.type === "result") continue

    const stepInfo = getStepInfo(event)

    // Find matching tool_result for tool events
    let toolResult: unknown = undefined
    if (event.type === "tool") {
      const result = events.find(
        (e, j) => j > i && e.type === "tool_result" && e.name === event.name
      )
      if (result && result.type === "tool_result") {
        toolResult = extractMcpContent(result.result)
      }
    }

    steps.push({
      id: `step-${i}`,
      icon: stepInfo.icon,
      label: stepInfo.label,
      event,
      toolResult,
    })
  }

  return steps
}

/**
 * Get short tool name from full MCP path
 */
function getShortToolName(fullName: string): string {
  const parts = fullName.split("__")
  return parts[parts.length - 1] || fullName
}

/**
 * Format tool name for display
 */
function formatToolName(name: string): string {
  return getShortToolName(name)
    .replace(/^admob_/, "")
    .replace(/^admanager_/, "")
    .split("_")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
}

export function StepsTimeline({ events, isStreaming = false, hasPendingApproval = false, className }: StepsTimelineProps) {
  const steps = React.useMemo(() => eventsToSteps(events), [events])

  // Show spinner when streaming OR when waiting for approval
  const showSpinner = isStreaming || hasPendingApproval

  // Track if user has manually toggled (to respect their choice)
  const [userToggled, setUserToggled] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(true)

  // Auto-collapse when streaming finishes, but respect user's manual toggle
  const prevShowSpinner = React.useRef(showSpinner)
  React.useEffect(() => {
    // When streaming ends (showSpinner goes from true to false)
    if (prevShowSpinner.current && !showSpinner && !userToggled) {
      setIsOpen(false)
    }
    prevShowSpinner.current = showSpinner
  }, [showSpinner, userToggled])

  // Reset userToggled when new events start streaming
  React.useEffect(() => {
    if (showSpinner) {
      setUserToggled(false)
      setIsOpen(true)
    }
  }, [showSpinner])

  const handleToggle = () => {
    setUserToggled(true)
    setIsOpen(!isOpen)
  }

  if (steps.length === 0) return null

  return (
    <div className={cn("mb-3", className)}>
      {/* Collapsible header - click to toggle entire section */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 mb-2 text-sm text-left hover:text-foreground transition-colors group"
      >
        {showSpinner ? (
          <>
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500/40" />
              <div className="relative h-4 w-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </span>
            <TextShimmer duration={2}>
              {steps.length} {steps.length === 1 ? "step" : "steps"} in progress...
            </TextShimmer>
          </>
        ) : (
          <>
            <Check className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {steps.length} {steps.length === 1 ? "step" : "steps"} completed
            </span>
          </>
        )}
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Collapsible content - Chain of thought steps */}
      {isOpen && (
        <ChainOfThought>
        {steps.map((step, index) => {
          const IconComponent = IconMap[step.icon]
          const isLastStep = index === steps.length - 1
          const isActiveStep = isLastStep && isStreaming
          const event = step.event

          // Helper to render icon with or without ping animation
          const renderIcon = () =>
            isActiveStep ? (
              <span className="relative inline-flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500/40" />
                <IconComponent className="relative h-4 w-4 text-violet-500" />
              </span>
            ) : (
              <IconComponent className="h-4 w-4 text-muted-foreground" />
            )

          // For tool events, render the Tool card component
          if (event.type === "tool") {
            const hasResult = step.toolResult !== undefined
            return (
              <ChainOfThoughtStep key={step.id} defaultOpen={false}>
                <ChainOfThoughtTrigger leftIcon={renderIcon()} swapIconOnHover={true}>
                  {step.label}
                </ChainOfThoughtTrigger>
                <ChainOfThoughtContent>
                  <Tool
                    toolPart={{
                      type: formatToolName(event.name),
                      state: hasResult ? "output-available" : isActiveStep ? "input-streaming" : "input-available",
                      input: event.params as Record<string, unknown>,
                      output: hasResult ? (step.toolResult as Record<string, unknown>) : undefined,
                    }}
                    defaultOpen={true}
                  />
                </ChainOfThoughtContent>
              </ChainOfThoughtStep>
            )
          }

          // For routing events with thinking
          if (event.type === "routing" && event.thinking) {
            return (
              <ChainOfThoughtStep key={step.id} defaultOpen={false}>
                <ChainOfThoughtTrigger leftIcon={renderIcon()} swapIconOnHover={true}>
                  {step.label}
                </ChainOfThoughtTrigger>
                <ChainOfThoughtContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.thinking}
                  </p>
                </ChainOfThoughtContent>
              </ChainOfThoughtStep>
            )
          }

          // For thinking events
          if (event.type === "thinking") {
            return (
              <ChainOfThoughtStep key={step.id} defaultOpen={false}>
                <ChainOfThoughtTrigger leftIcon={renderIcon()} swapIconOnHover={true}>
                  {step.label}
                </ChainOfThoughtTrigger>
                <ChainOfThoughtContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.content}
                  </p>
                </ChainOfThoughtContent>
              </ChainOfThoughtStep>
            )
          }

          // For content events (intermediate responses)
          if (event.type === "content") {
            return (
              <ChainOfThoughtStep key={step.id} defaultOpen={false}>
                <ChainOfThoughtTrigger leftIcon={renderIcon()} swapIconOnHover={true}>
                  {step.label}
                </ChainOfThoughtTrigger>
                <ChainOfThoughtContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.content}
                  </p>
                </ChainOfThoughtContent>
              </ChainOfThoughtStep>
            )
          }

          // For tool_executing events (always show as active/spinning)
          if (event.type === "tool_executing") {
            return (
              <ChainOfThoughtStep key={step.id} defaultOpen={false}>
                <ChainOfThoughtTrigger
                  leftIcon={
                    <span className="relative inline-flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500/40" />
                      <IconComponent className="relative h-4 w-4 text-violet-500" />
                    </span>
                  }
                  swapIconOnHover={false}
                >
                  <TextShimmer duration={2}>{step.label}</TextShimmer>
                </ChainOfThoughtTrigger>
              </ChainOfThoughtStep>
            )
          }

          // Default: simple step without expandable content
          return (
            <ChainOfThoughtStep key={step.id} defaultOpen={false}>
              <ChainOfThoughtTrigger leftIcon={renderIcon()} swapIconOnHover={false}>
                {step.label}
              </ChainOfThoughtTrigger>
            </ChainOfThoughtStep>
          )
        })}
      </ChainOfThought>
      )}
    </div>
  )
}

/**
 * Paused indicator shown when tool approval is pending
 */
export function TimelinePausedIndicator() {
  return (
    <div className="flex items-center gap-2 py-2 ml-0.5">
      <div className="h-4 w-4 rounded-full bg-amber-500/20 flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
      </div>
      <TextShimmer duration={3} className="text-sm">
        Waiting for approval...
      </TextShimmer>
    </div>
  )
}
