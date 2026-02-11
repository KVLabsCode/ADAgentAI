"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ExamplePrompts } from "./example-prompts"
import { streamChat, type ChatHistoryMessage, type ChatContext } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { useChatSettings } from "@/lib/chat-settings"
import { useDemo } from "@/contexts/demo-mode-context"
import {
  useChatPersistence,
  saveChatState,
  clearChatState,
  useChatApprovals,
  extractPendingApprovals,
  useChatSession,
} from "@/hooks/chat"
import type { Message, Provider, StreamEventItem, RJSFSchema } from "@/lib/types"
import { extractMcpContent } from "@/lib/step-utils"
import { Zap, FlaskConical } from "lucide-react"
import Link from "next/link"

interface ChatContainerProps {
  initialMessages?: Message[]
  providers?: Provider[]
  isLoadingProviders?: boolean
  sessionId?: string
}

export function ChatContainer({
  initialMessages = [],
  providers = [],
  isLoadingProviders = false,
  sessionId: initialSessionId
}: ChatContainerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const newChatParam = searchParams.get('new')
  const { user, getAccessToken, selectedOrganizationId } = useUser()
  const { enabledProviderIds, enabledAppIds, responseStyle, autoIncludeContext, selectedModel, contextMode } = useChatSettings()
  const { isDemoMode } = useDemo()

  // Core state
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = React.useState(false)
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(initialSessionId || null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Stream tracking for reconnection
  const currentStreamIdRef = React.useRef<string | null>(null)
  const currentAssistantIdRef = React.useRef<string | null>(null)

  // Session management
  const { createSession, saveMessage } = useChatSession({ getAccessToken, selectedOrganizationId })

  // Tool approvals
  const {
    pendingApprovals,
    setPendingApprovals,
    handleToolApproval,
  } = useChatApprovals({
    getAccessToken,
    currentStreamIdRef,
    currentAssistantIdRef,
    abortControllerRef,
    setMessages,
    setIsLoading,
  })

  // Persistence - hydrate from localStorage
  const { isHydrated } = useChatPersistence({
    initialMessages,
    initialSessionId,
    onRestore: (restoredMessages, restoredSessionId) => {
      setMessages(restoredMessages)
      setCurrentSessionId(restoredSessionId)
      setPendingApprovals(extractPendingApprovals(restoredMessages))
    },
  })

  // Restore pending approvals from initial messages
  React.useEffect(() => {
    if (initialMessages.length > 0 && isHydrated) {
      setPendingApprovals(extractPendingApprovals(initialMessages))
    }
  }, [initialMessages, isHydrated, setPendingApprovals])

  // Persist chat state when messages change
  React.useEffect(() => {
    if (!isHydrated) return
    saveChatState(messages, currentSessionId)
  }, [messages, currentSessionId, isHydrated])

  // Track session changes for navigation handling
  const lastSessionIdRef = React.useRef<string | undefined>(undefined)
  const hasInitialized = React.useRef(false)

  // Reset state when navigating to a different session
  React.useEffect(() => {
    if (!isHydrated) return

    if (!hasInitialized.current) {
      hasInitialized.current = true
      lastSessionIdRef.current = initialSessionId
      return
    }

    if (lastSessionIdRef.current === initialSessionId) return

    lastSessionIdRef.current = initialSessionId
    abortControllerRef.current?.abort()
    setMessages(initialMessages)
    setCurrentSessionId(initialSessionId || null)
    setIsLoading(false)
    setPendingApprovals(new Map())
    currentStreamIdRef.current = null
    currentAssistantIdRef.current = null
  }, [initialSessionId, isHydrated, initialMessages, setPendingApprovals])

  // Handle pathname changes (back to /chat from session)
  const prevPathnameRef = React.useRef(pathname)

  React.useEffect(() => {
    const prevPathname = prevPathnameRef.current
    prevPathnameRef.current = pathname

    if (pathname === '/chat' && prevPathname?.startsWith('/chat/') && prevPathname !== '/chat') {
      abortControllerRef.current?.abort()
      setMessages([])
      setCurrentSessionId(null)
      setIsLoading(false)
      setPendingApprovals(new Map())
      currentStreamIdRef.current = null
      currentAssistantIdRef.current = null
      clearChatState()
    }
  }, [pathname, setPendingApprovals])

  // Handle ?new= param for starting new chat
  React.useEffect(() => {
    if (newChatParam && pathname === '/chat') {
      abortControllerRef.current?.abort()
      setMessages([])
      setCurrentSessionId(null)
      setIsLoading(false)
      setPendingApprovals(new Map())
      currentStreamIdRef.current = null
      currentAssistantIdRef.current = null
      clearChatState()
      window.history.replaceState({}, '', '/chat')
    }
  }, [newChatParam, pathname, setPendingApprovals])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const activeProviders = React.useMemo(
    () => providers.filter((p) => p.status === "connected" && p.isEnabled !== false),
    [providers]
  )
  const hasProviders = activeProviders.length > 0
  const activeProviderIds = React.useMemo(
    () => new Set(activeProviders.map((p) => p.id)),
    [activeProviders]
  )
  const effectiveEnabledProviderIds = React.useMemo(() => {
    if (enabledProviderIds.length === 0) {
      return activeProviders.map((p) => p.id)
    }
    return enabledProviderIds.filter((id) => activeProviderIds.has(id))
  }, [activeProviderIds, activeProviders, enabledProviderIds])
  const hasMessages = messages.length > 0
  const userId = user?.id

  // Build context for API calls
  const chatContext: ChatContext = React.useMemo(() => ({
    enabledProviderIds: effectiveEnabledProviderIds,
    enabledAppIds,
    responseStyle,
    autoIncludeContext,
    selectedModel,
    contextMode,
  }), [effectiveEnabledProviderIds, enabledAppIds, responseStyle, autoIncludeContext, selectedModel, contextMode])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !hasProviders) return

    // Cancel any pending tool approvals from previous messages
    // When user sends a new message, pending approvals are no longer relevant
    const pendingApprovalIds: string[] = []
    pendingApprovals.forEach((state, approvalId) => {
      if (state === null) {
        pendingApprovalIds.push(approvalId)
      }
    })

    if (pendingApprovalIds.length > 0) {
      // Add tool_cancelled events to messages with pending approvals
      setMessages(prev => prev.map(msg => {
        if (!msg.events) return msg

        // Find tool_approval_required events that are being cancelled
        const cancelledEvents: StreamEventItem[] = []
        for (const event of msg.events) {
          if (event.type === "tool_approval_required" && pendingApprovalIds.includes(event.approval_id)) {
            cancelledEvents.push({
              type: "tool_cancelled",
              tool_name: event.tool_name,
              approval_id: event.approval_id
            })
          }
        }

        if (cancelledEvents.length > 0) {
          return { ...msg, events: [...msg.events, ...cancelledEvents] }
        }
        return msg
      }))

      // Mark approvals as cancelled in the map (use false to indicate not approved)
      setPendingApprovals(prev => {
        const newMap = new Map(prev)
        for (const approvalId of pendingApprovalIds) {
          newMap.set(approvalId, false) // Mark as cancelled/denied
        }
        return newMap
      })
    }

    const accessToken = await getAccessToken()
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    // Create session if first message
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await createSession(content.slice(0, 2000))
      if (sessionId) {
        window.history.replaceState(null, '', `/chat/${sessionId}`)
        setCurrentSessionId(sessionId)
      }
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    }

    const assistantId = crypto.randomUUID()
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      agentName: "",
      events: [],
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setIsLoading(true)

    currentAssistantIdRef.current = assistantId
    currentStreamIdRef.current = null

    if (sessionId) {
      saveMessage(sessionId, 'user', content)
    }

    const events: StreamEventItem[] = []
    const toolCalls: { name: string; params: Record<string, unknown> }[] = []
    const toolResults: { name: string; result: unknown }[] = []
    let finalContent = ""
    let pendingContent = "" // Content accumulated before tool calls (for chain of thought)

    const history: ChatHistoryMessage[] = messages
      .filter((m): m is Message & { role: "user" | "assistant" } =>
        (m.role === "user" || m.role === "assistant") && !!m.content?.trim()
      )
      .map(m => ({ role: m.role, content: m.content }))

    await streamChat(
      content,
      {
        onStreamId: (streamId) => {
          currentStreamIdRef.current = streamId
        },
        onRouting: (service, capability, thinking, executionPath, modelSelected) => {
          events.push({ type: "routing", service, capability, thinking, execution_path: executionPath, model_selected: modelSelected })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, agentName: `${service} / ${capability}`, events: [...events] }
                : m
            )
          )
        },
        onAgent: (agent, _task) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, agentName: agent || m.agentName } : m
            )
          )
        },
        onThinking: (thinkingContent, model) => {
          // Append to existing thinking event or create new one
          const lastEvent = events[events.length - 1]
          if (lastEvent && lastEvent.type === "thinking") {
            // Append to existing thinking event
            lastEvent.content = (lastEvent.content || "") + thinkingContent
            if (model) lastEvent.model = model
          } else {
            // Create new thinking event
            events.push({ type: "thinking", content: thinkingContent, model })
          }
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, events: [...events] } : m
            )
          )
        },
        onToolCall: (tool, inputPreview, inputFull, approved, model) => {
          // Flush any pending content as a "content" event BEFORE the tool event
          // This creates the chain of thought: "I'll help you..." → Tool: get_data
          if (pendingContent.trim()) {
            events.push({ type: "content", content: pendingContent.trim() })
            pendingContent = "" // Reset for next segment
          }

          let params: Record<string, unknown> = {}
          try {
            const inputStr = inputFull || inputPreview
            if (inputStr) params = JSON.parse(inputStr)
          } catch {
            params = { input: inputPreview }
          }
          events.push({ type: "tool", name: tool, params, approved, model })
          toolCalls.push({ name: tool, params })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, events: [...events] } : m
            )
          )
        },
        onToolResult: (toolName, preview, full, dataType) => {
          // Use tool name from event (passed by backend) instead of relying on lastToolCall
          // This fixes the issue where tool results weren't matched correctly after approval resume
          let result: unknown = preview
          if (dataType === "json" || dataType === "json_list") {
            try {
              result = JSON.parse(full || preview)
              // Extract actual content from MCP content blocks if present
              result = extractMcpContent(result)
            } catch {
              result = preview
            }
          }
          events.push({ type: "tool_result", name: toolName, result })
          toolResults.push({ name: toolName, result })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, events: [...events] } : m
            )
          )
        },
        onToolApprovalRequired: (approvalId, toolName, toolInput, parameterSchema) => {
          events.push({
            type: "tool_approval_required",
            approval_id: approvalId,
            tool_name: toolName,
            tool_input: toolInput,
            parameter_schema: parameterSchema as RJSFSchema | undefined
          })
          setPendingApprovals(prev => {
            const newMap = new Map(prev)
            newMap.set(approvalId, null)
            return newMap
          })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, events: [...events] } : m
            )
          )
        },
        onToolDenied: (toolName, reason) => {
          events.push({ type: "tool_denied", tool_name: toolName, reason })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, events: [...events] } : m
            )
          )
        },
        onActionRequired: (actionType, message, deepLink, blocking, metadata) => {
          events.push({
            type: "action_required",
            action_type: actionType as import("@/lib/types").ActionRequiredType,
            message,
            deep_link: deepLink,
            blocking: blocking ?? true,
            metadata
          })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, events: [...events] } : m
            )
          )
        },
        onContent: (chunk) => {
          // Accumulate content for live display AND for chain of thought
          // Content will be pushed as "content" event when a tool call arrives (see onToolCall)
          // This creates the flow: intermediate text → tool call → tool result → final answer
          finalContent += chunk
          pendingContent += chunk
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: finalContent }
                : m
            )
          )
        },
        onResult: (resultContent, model) => {
          finalContent = resultContent
          // Push result event for final answer (distinct from intermediate content)
          events.push({ type: "result", content: resultContent, model })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content: resultContent, events: [...events] } : m
            )
          )
        },
        onError: (error) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content: `Error: ${error}` } : m
            )
          )
          setIsLoading(false)
        },
        onDone: () => {
          setIsLoading(false)
          if (sessionId && finalContent) {
            const allThinking = events
              .filter((e): e is StreamEventItem & { type: "thinking" } => e.type === "thinking")
              .map(e => e.content)
              .join("\n\n")

            saveMessage(sessionId, 'assistant', finalContent, {
              thinking: allThinking,
              toolCalls,
              toolResults,
              events,
            })
          }
        },
      },
      abortControllerRef.current.signal,
      userId,
      history,
      chatContext,
      accessToken,
      selectedOrganizationId
    )

    setIsLoading(false)
  }

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  const handleStop = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    // Mark current assistant message as aborted so we don't show intermediate content as final answer
    const currentAssistantId = currentAssistantIdRef.current
    if (currentAssistantId) {
      setMessages(prev =>
        prev.map(m =>
          m.id === currentAssistantId ? { ...m, aborted: true } : m
        )
      )
    }
    setIsLoading(false)
  }, [])

  return (
    <div className="flex flex-col h-full" data-testid="chat-container">
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
          <div className="max-w-xl w-full space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-[length:var(--text-page-title)] font-semibold tracking-tight">
                {hasProviders ? "How can I help you today?" : "Connect a provider to start"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {hasProviders
                  ? "Ask about your ad performance, create reports, or get optimization tips."
                  : "Link your AdMob account to begin."}
              </p>
            </div>

            <div className="w-full">
              <ChatInput
                onSend={handleSendMessage}
                onStop={handleStop}
                disabled={!hasProviders}
                isLoading={isLoading}
                isLoadingProviders={isLoadingProviders}
                placeholder={hasProviders ? "Ask anything about your ads..." : "Connect a provider first"}
                providers={activeProviders}
                isCentered
              >
                {hasProviders && (
                  <ExamplePrompts onPromptClick={handlePromptClick} />
                )}
              </ChatInput>

              {/* Quick actions */}
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                {isDemoMode && (
                  <Link
                    href="/experiments"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-violet-500 hover:text-violet-400 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 transition-colors"
                  >
                    <FlaskConical className="h-3 w-3" />
                    Create A/B Test
                  </Link>
                )}
                <button
                  onClick={() => handlePromptClick("Create any admob mediation group. You must use the tool.")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-violet-500 hover:text-violet-400 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 transition-colors"
                >
                  <Zap className="h-3 w-3" />
                  Dev: Create Mediation Group
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1">
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              onToolApproval={handleToolApproval}
              pendingApprovals={pendingApprovals}
            />
          </div>

          <div className="sticky bottom-0 z-50 px-4 pt-12">
            {/* Gradient fade so text fades behind - solid at bottom, fades up */}
            <div className="absolute inset-0 bg-gradient-to-t from-background from-55% via-background/80 via-75% to-transparent pointer-events-none" />
            <div className="relative max-w-3xl mx-auto w-full pb-8">
              <ChatInput
                onSend={handleSendMessage}
                onStop={handleStop}
                disabled={!hasProviders}
                isLoading={isLoading}
                isLoadingProviders={isLoadingProviders}
                providers={activeProviders}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
