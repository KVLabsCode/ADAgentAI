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
  Shield,
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
import { Loader } from "@/components/ui/loader"
import { Button } from "@/atoms/button"
import { RJSFParameterForm } from "./rjsf"
import { getStepInfo, extractMcpContent, type StepIconName } from "@/lib/step-utils"
import { formatModelName } from "./assistant-message/utils"
import type { StreamEventItem, RJSFSchema } from "@/lib/types"

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
  onToolApproval?: (approvalId: string, approved: boolean, modifiedParams?: Record<string, unknown>) => void
  pendingApprovals?: Map<string, boolean | null>
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

  // Build a set of tool names that have pending approval events
  const toolsWithApproval = new Set<string>()
  for (const event of events) {
    if (event.type === "tool_approval_required") {
      toolsWithApproval.add(event.tool_name)
    }
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    // Skip result-type events (they're paired with tool events)
    if (event.type === "tool_result") continue
    if (event.type === "tool_denied") continue
    if (event.type === "result") continue

    // Skip tool events that have a corresponding approval event
    // The approval event will show the form instead
    if (event.type === "tool" && toolsWithApproval.has(event.name)) {
      continue
    }

    // Skip tool_executing events that have a corresponding approval event
    // The approval step already shows the executing state
    if (event.type === "tool_executing" && toolsWithApproval.has(event.tool_name)) {
      continue
    }

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

/**
 * Small pill badge showing which model handled this step
 */
function ModelBadge({ model }: { model?: string }) {
  const display = formatModelName(model)
  if (!display) return null
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300">
      {display}
    </span>
  )
}

/**
 * Tool Approval Step - renders the approval form inside the timeline
 */
interface ToolApprovalStepProps {
  step: TimelineStep
  event: Extract<StreamEventItem, { type: "tool_approval_required" }>
  isPending: boolean
  isExecuting: boolean
  isDenied: boolean
  toolResult?: unknown  // Result from tool_result event (if execution completed)
  onApproval?: (approvalId: string, approved: boolean, modifiedParams?: Record<string, unknown>) => void
}

function ToolApprovalStep({ step, event, isPending, isExecuting, isDenied, toolResult, onApproval }: ToolApprovalStepProps) {
  // Parse initial values from tool input
  const initialValues = React.useMemo(() => {
    try {
      let parsed = JSON.parse(event.tool_input) as Record<string, unknown>

      // Unwrap "params" wrapper if present
      if (parsed.params && typeof parsed.params === "object") {
        parsed = parsed.params as Record<string, unknown>
      }

      // Parse body_json string and merge its contents (common pattern for Google API tools)
      // This ensures LLM recommendations in body_json are reflected in form fields
      if (typeof parsed.body_json === "string") {
        try {
          const bodyContent = JSON.parse(parsed.body_json) as Record<string, unknown>
          // Merge body_json contents, keeping parent/account separate
          const { body_json: _, ...rest } = parsed
          parsed = { ...rest, ...bodyContent }
        } catch {
          // body_json wasn't valid JSON, keep as-is
        }
      }

      return parsed
    } catch {
      return {}
    }
  }, [event.tool_input])

  // Track form state
  const [currentValues, setCurrentValues] = React.useState<Record<string, unknown>>(initialValues)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [hasErrors, setHasErrors] = React.useState(false)

  const handleParamChange = React.useCallback((values: Record<string, unknown>, changed: boolean, errors: boolean) => {
    setCurrentValues(values)
    setHasChanges(changed)
    setHasErrors(errors)
  }, [])

  const handleApproval = (approved: boolean) => {
    if (onApproval) {
      if (approved && hasChanges) {
        onApproval(event.approval_id, true, currentValues)
      } else {
        onApproval(event.approval_id, approved)
      }
    }
  }

  // Determine tool state
  // If we have a result, show it (even if isExecuting is still true from approval state)
  const hasResult = toolResult !== undefined
  const toolState = isPending ? "approval-pending" : isDenied ? "output-error" : hasResult ? "output-available" : isExecuting ? "input-streaming" : "output-available"

  // Render icon based on state - Plus icon for pending approval
  const renderIcon = () => {
    if (isPending) {
      return (
        <span className="relative inline-flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500/40" />
          <Plus className="relative h-4 w-4 text-orange-500" />
        </span>
      )
    }
    // Show completed state when result is available (even if isExecuting flag is still true)
    if (hasResult || isDenied) {
      return <Plus className="h-4 w-4 text-muted-foreground" />
    }
    if (isExecuting) {
      return (
        <span className="relative inline-flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500/40" />
          <Plus className="relative h-4 w-4 text-violet-500" />
        </span>
      )
    }
    return <Plus className="h-4 w-4 text-muted-foreground" />
  }

  // Approval buttons
  const approvalButtons = isPending && (
    <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/40">
      <div className="flex items-center gap-2 text-[10px]">
        <Shield className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          {hasErrors ? "Fill required fields" : hasChanges ? "Review changes" : "Approval required"}
        </span>
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
    <ChainOfThoughtStep key={step.id} defaultOpen={true}>
      <ChainOfThoughtTrigger leftIcon={renderIcon()} swapIconOnHover={false}>
        {isPending ? (
          <TextShimmer duration={2}>{step.label}</TextShimmer>
        ) : hasResult || isDenied ? (
          step.label
        ) : isExecuting ? (
          <TextShimmer duration={2}>Executing {formatToolName(event.tool_name)}...</TextShimmer>
        ) : (
          step.label
        )}
      </ChainOfThoughtTrigger>

      <ChainOfThoughtContent>
        <Tool
          toolPart={{
            type: formatToolName(event.tool_name),
            state: toolState,
            input: event.parameter_schema && isPending ? undefined : initialValues,
            output: hasResult ? (toolResult as Record<string, unknown>) : undefined,
            errorText: isDenied ? "Execution denied" : undefined,
          }}
          defaultOpen={true}
          approvalContent={
            <>
              {/* Editable form when schema available and pending */}
              {event.parameter_schema && isPending && (
                <div className="mb-4">
                  <RJSFParameterForm
                    rjsfSchema={event.parameter_schema as RJSFSchema}
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
      </ChainOfThoughtContent>
    </ChainOfThoughtStep>
  )
}

export function StepsTimeline({
  events,
  isStreaming = false,
  hasPendingApproval = false,
  onToolApproval,
  pendingApprovals = new Map(),
  className
}: StepsTimelineProps) {
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
        className="flex items-center gap-1.5 mb-4 text-sm text-left hover:text-foreground transition-colors group"
      >
        {showSpinner ? (
          <>
            <Loader variant="circular" size="sm" className="text-muted-foreground" />
            <TextShimmer duration={2}>
              {steps.length} {steps.length === 1 ? "step" : "steps"} in progress...
            </TextShimmer>
          </>
        ) : (
          <span className="text-muted-foreground">
            {steps.length} {steps.length === 1 ? "step" : "steps"} completed
          </span>
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
                  <span className="flex items-center gap-2">
                    {step.label}
                    <ModelBadge model={event.model} />
                  </span>
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

          // For routing events (with or without thinking)
          if (event.type === "routing") {
            if (event.thinking) {
              return (
                <ChainOfThoughtStep key={step.id} defaultOpen={false}>
                  <ChainOfThoughtTrigger leftIcon={renderIcon()} swapIconOnHover={true}>
                    <span className="flex items-center gap-2">
                      {step.label}
                      <ModelBadge model={event.model_selected} />
                    </span>
                  </ChainOfThoughtTrigger>
                  <ChainOfThoughtContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {event.thinking}
                    </p>
                  </ChainOfThoughtContent>
                </ChainOfThoughtStep>
              )
            }

            // Routing without thinking - simple display with model badge
            return (
              <ChainOfThoughtStep key={step.id} defaultOpen={false}>
                <ChainOfThoughtTrigger leftIcon={renderIcon()} swapIconOnHover={false}>
                  <span className="flex items-center gap-2">
                    {step.label}
                    <ModelBadge model={event.model_selected} />
                  </span>
                </ChainOfThoughtTrigger>
              </ChainOfThoughtStep>
            )
          }

          // For thinking events
          if (event.type === "thinking") {
            return (
              <ChainOfThoughtStep key={step.id} defaultOpen={false}>
                <ChainOfThoughtTrigger leftIcon={renderIcon()} swapIconOnHover={true}>
                  <span className="flex items-center gap-2">
                    {step.label}
                    <ModelBadge model={event.model} />
                  </span>
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

          // For tool_approval_required events - render approval form
          if (event.type === "tool_approval_required") {
            const approvalState = pendingApprovals.get(event.approval_id)
            const isPending = approvalState === undefined || approvalState === null
            const isExecuting = approvalState === true
            const isDenied = approvalState === false

            // Only look for tool_result if this approval has been resolved (not pending)
            // This prevents showing results from a previous call when same tool is called twice
            let toolResult: unknown = undefined
            if (!isPending) {
              const toolResultEvent = events.find(
                (e) => e.type === "tool_result" && e.name === event.tool_name
              )
              toolResult = toolResultEvent?.type === "tool_result" ? toolResultEvent.result : undefined
            }

            return (
              <ToolApprovalStep
                key={step.id}
                step={step}
                event={event}
                isPending={isPending}
                isExecuting={isExecuting}
                isDenied={isDenied}
                toolResult={toolResult}
                onApproval={onToolApproval}
              />
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
