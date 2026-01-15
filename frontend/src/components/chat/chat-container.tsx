"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ExamplePrompts } from "./example-prompts"
import { streamChat, type ChatHistoryMessage, type ChatContext } from "@/lib/api"
import { useUser } from "@/hooks/use-user"
import { useChatSettings } from "@/lib/chat-settings"
import {
  useChatPersistence,
  saveChatState,
  clearChatState,
  useChatApprovals,
  extractPendingApprovals,
  useChatSession,
} from "@/hooks/chat"
import type { Message, Provider, StreamEventItem, RJSFSchema } from "@/lib/types"

interface ChatContainerProps {
  initialMessages?: Message[]
  providers?: Provider[]
  sessionId?: string
}

export function ChatContainer({
  initialMessages = [],
  providers = [],
  sessionId: initialSessionId
}: ChatContainerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const newChatParam = searchParams.get('new')
  const { user, getAccessToken } = useUser()
  const { enabledProviderIds, enabledAppIds, responseStyle, autoIncludeContext, selectedModel } = useChatSettings()

  // Core state
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = React.useState(false)
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(initialSessionId || null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Stream tracking for reconnection
  const currentStreamIdRef = React.useRef<string | null>(null)
  const currentAssistantIdRef = React.useRef<string | null>(null)

  // Session management
  const { createSession, saveMessage } = useChatSession({ getAccessToken })

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

  const hasProviders = providers.some(p => p.status === "connected")
  const hasMessages = messages.length > 0
  const userId = user?.id

  // Build context for API calls
  const chatContext: ChatContext = React.useMemo(() => ({
    enabledProviderIds,
    enabledAppIds,
    responseStyle,
    autoIncludeContext,
    selectedModel,
  }), [enabledProviderIds, enabledAppIds, responseStyle, autoIncludeContext, selectedModel])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !hasProviders) return

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
        onRouting: (service, capability, thinking) => {
          events.push({ type: "routing", service, capability, thinking })
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
        onThinking: (thinkingContent) => {
          events.push({ type: "thinking", content: thinkingContent })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, events: [...events] } : m
            )
          )
        },
        onToolCall: (tool, inputPreview, inputFull, approved) => {
          let params: Record<string, unknown> = {}
          try {
            const inputStr = inputFull || inputPreview
            if (inputStr) params = JSON.parse(inputStr)
          } catch {
            params = { input: inputPreview }
          }
          events.push({ type: "tool", name: tool, params, approved })
          toolCalls.push({ name: tool, params })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, events: [...events] } : m
            )
          )
        },
        onToolResult: (preview, full, dataType) => {
          const lastToolCall = toolCalls[toolCalls.length - 1]
          let result: unknown = preview
          if (dataType === "json" || dataType === "json_list") {
            try {
              result = JSON.parse(full || preview)
            } catch {
              result = preview
            }
          }
          events.push({ type: "tool_result", name: lastToolCall?.name || "unknown", result })
          toolResults.push({ name: lastToolCall?.name || "unknown", result })
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
        onContent: (chunk) => {
          finalContent += chunk
          events.push({ type: "content", content: chunk })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: finalContent, events: [...events] }
                : m
            )
          )
        },
        onResult: (resultContent) => {
          finalContent = resultContent
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content: resultContent } : m
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
      accessToken
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
    setIsLoading(false)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
          <div className="max-w-xl w-full space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-medium tracking-tight">
                {hasProviders ? "How can I help you today?" : "Connect a provider to start"}
              </h2>
              <p className="text-xs text-muted-foreground/70">
                {hasProviders
                  ? "Ask about your ad performance, create reports, or get optimization tips."
                  : "Link your AdMob account to begin."}
              </p>
            </div>

            {hasProviders && (
              <ExamplePrompts onPromptClick={handlePromptClick} />
            )}

            <div className="w-full">
              <ChatInput
                onSend={handleSendMessage}
                onStop={handleStop}
                disabled={!hasProviders}
                isLoading={isLoading}
                placeholder={hasProviders ? "Ask anything about your ads..." : "Connect a provider first"}
                providers={providers}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 pb-20">
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              onToolApproval={handleToolApproval}
              pendingApprovals={pendingApprovals}
            />
          </div>

          <div className="sticky bottom-0 z-50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-t border-border/30 px-4 py-4">
            <div className="max-w-3xl mx-auto w-full">
              <ChatInput
                onSend={handleSendMessage}
                onStop={handleStop}
                disabled={!hasProviders}
                isLoading={isLoading}
                providers={providers}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
