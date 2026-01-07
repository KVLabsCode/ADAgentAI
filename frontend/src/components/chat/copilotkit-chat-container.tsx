"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useCopilotChat, useCopilotMessagesContext } from "@copilotkit/react-core"
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql"
import { ChatHeader } from "./chat-header"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ExamplePrompts } from "./example-prompts"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import type { Message, Provider, StreamEventItem } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

// CopilotKit message types
interface CopilotToolCall {
  name?: string
  toolName?: string
  args?: Record<string, unknown>
  arguments?: Record<string, unknown>
  result?: unknown
}

interface CopilotMessage {
  id: string
  role: string
  content?: string
  agentName?: string
  toolCalls?: CopilotToolCall[]
  type?: string
  constructor?: { name?: string }
}

interface CopilotKitChatContainerProps {
  initialMessages?: Message[]
  providers?: Provider[]
  sessionId?: string
}

// Map CopilotKit message to our custom Message format
function mapCopilotMessage(msg: CopilotMessage): Message {
  const events: StreamEventItem[] = []

  // Add tool call events if available from the message
  if (msg.toolCalls?.length) {
    msg.toolCalls.forEach((tc) => {
      events.push({
        type: "tool" as const,
        name: tc.name || tc.toolName || "unknown",
        params: (tc.args || tc.arguments || {}) as Record<string, unknown>
      })
      if (tc.result !== undefined) {
        events.push({
          type: "tool_result" as const,
          name: tc.name || tc.toolName || "unknown",
          result: tc.result
        })
      }
    })
  }

  return {
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content || "",
    agentName: msg.agentName,
    createdAt: new Date().toISOString(),
    events: events.length > 0 ? events : undefined,
    hasToolCalls: (msg.toolCalls?.length || 0) > 0,
    toolCalls: msg.toolCalls?.map((tc) => ({
      name: tc.name || tc.toolName || "unknown",
      params: (tc.args || tc.arguments || {}) as Record<string, unknown>
    })),
    toolResults: msg.toolCalls?.filter((tc) => tc.result !== undefined).map((tc) => ({
      name: tc.name || tc.toolName || "unknown",
      result: tc.result
    })),
  }
}

export function CopilotKitChatContainer({
  initialMessages = [],
  providers = [],
  sessionId: initialSessionId
}: CopilotKitChatContainerProps) {
  const router = useRouter()
  const { getAccessToken } = useUser()
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(initialSessionId || null)

  // Tool approval state: Map<approvalId, approved | null>
  const [pendingApprovals, setPendingApprovals] = React.useState<Map<string, boolean | null>>(new Map())

  // CopilotKit chat hook
  const chatHook = useCopilotChat()
  const {
    visibleMessages = [],
    appendMessage,
    isLoading,
    stopGeneration,
    reset,
  } = chatHook || {}

  // Get messages from the messages context (more reliable than visibleMessages)
  const messagesContext = useCopilotMessagesContext()
  // Memoize contextMessages to avoid dependency changes on every render
  const contextMessages = React.useMemo(
    () => (messagesContext?.messages || []) as CopilotMessage[],
    [messagesContext?.messages]
  )

  // Debug: log messages from both sources
  React.useEffect(() => {
    console.log('[CopilotKit] Messages comparison:', {
      visibleMessages: visibleMessages?.length || 0,
      contextMessages: contextMessages?.length || 0,
      contextMessagesData: contextMessages
    })
  }, [visibleMessages, contextMessages])

  const handleToolApproval = React.useCallback((approvalId: string, approved: boolean) => {
    setPendingApprovals(prev => {
      const newMap = new Map(prev)
      newMap.set(approvalId, approved)
      return newMap
    })
    // Note: In CopilotKit mode, the approval API call would need to be added here
    // This container is not currently using the SSE streaming backend
  }, [])

  const hasProviders = providers.some(p => p.status === "connected")

  // Map CopilotKit messages to our custom format
  const messages: Message[] = React.useMemo(() => {
    // Use contextMessages (from useCopilotMessagesContext) as primary source
    // Fall back to visibleMessages if contextMessages is empty
    const rawMsgs: CopilotMessage[] = contextMessages.length > 0
      ? contextMessages
      : (Array.isArray(visibleMessages) ? visibleMessages as CopilotMessage[] : [])

    console.log('[CopilotKit] Mapping messages:', {
      source: contextMessages.length > 0 ? 'contextMessages' : 'visibleMessages',
      rawCount: rawMsgs.length,
      rawMessages: rawMsgs.map((m) => ({ id: m.id, role: m.role, content: m.content?.slice?.(0, 50) || '[no content]', type: m.type || m.constructor?.name }))
    })

    // Combine initial messages with CopilotKit messages
    const copilotMessages = rawMsgs.map((msg) => mapCopilotMessage(msg))

    // If we have initial messages and no copilot messages, show initial
    if (initialMessages.length > 0 && copilotMessages.length === 0) {
      return initialMessages
    }

    return copilotMessages
  }, [contextMessages, visibleMessages, initialMessages])

  const hasMessages = messages.length > 0

  // Create a new chat session
  const createSession = async (title?: string): Promise<string | null> => {
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(`${API_URL}/api/chat/session`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ title: title || 'New Chat' }),
      })
      if (response.ok) {
        const data = await response.json()
        return data.session.id
      }
    } catch (error) {
      console.error('Failed to create chat session:', error)
    }
    return null
  }

  // Track if we're actively sending a message (separate from CopilotKit's isLoading)
  const [isSending, setIsSending] = React.useState(false)

  const handleSendMessage = async (content: string) => {
    console.log('[CopilotKit] handleSendMessage called:', {
      content: content.slice(0, 50),
      isLoading,
      isSending,
      hasProviders,
      hasAppendMessage: !!appendMessage
    })

    if (!content.trim()) {
      console.log('[CopilotKit] Empty content, skipping')
      return
    }
    // Only block if WE are actively sending, not if CopilotKit is doing init
    if (isSending) {
      console.log('[CopilotKit] Already sending, skipping')
      return
    }
    if (!hasProviders) {
      console.log('[CopilotKit] No providers, skipping')
      return
    }
    if (!appendMessage) {
      console.error('[CopilotKit] appendMessage not available!')
      return
    }

    setIsSending(true)

    // Create a session if this is the first message
    let sessionId = currentSessionId
    if (!sessionId) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
      sessionId = await createSession(title)
      if (sessionId) {
        setCurrentSessionId(sessionId)
        window.history.replaceState(null, '', `/chat/${sessionId}`)
      }
    }

    // Send message via CopilotKit
    try {
      console.log('[CopilotKit] Calling appendMessage...')
      await appendMessage(
        new TextMessage({
          role: MessageRole.User,
          content,
        })
      )
      console.log('[CopilotKit] appendMessage completed')
    } catch (error) {
      console.error('[CopilotKit] Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  const handleNewChat = () => {
    reset()
    setCurrentSessionId(null)
    setPendingApprovals(new Map())
    router.push('/chat')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed Header */}
      <div className="shrink-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <ChatHeader hasProviders={hasProviders} onNewChat={handleNewChat} />
      </div>

      {!hasMessages ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
          <div className="max-w-xl w-full space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-medium tracking-tight">
                {hasProviders ? "How can I help you today?" : "Connect a provider to start"}
              </h2>
              <p className="text-xs text-muted-foreground/70">
                {hasProviders
                  ? "Ask about your ad performance, create reports, or get optimization tips."
                  : "Link your AdMob or Google Ad Manager account to begin."}
              </p>
            </div>

            {hasProviders && (
              <ExamplePrompts onPromptClick={handlePromptClick} />
            )}

            <div className="w-full">
              <ChatInput
                onSend={handleSendMessage}
                disabled={!hasProviders}
                isLoading={isSending || isLoading}
                placeholder={hasProviders ? "Ask anything about your ads..." : "Connect a provider first"}
                providers={providers}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Chat with messages */
        <>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ChatMessages
              messages={messages}
              isLoading={isSending || isLoading}
              onToolApproval={handleToolApproval}
              pendingApprovals={pendingApprovals}
            />
          </div>

          <div className="shrink-0 bg-background/95 backdrop-blur-sm border-t border-border/30 px-6 py-3">
            <div className="max-w-6xl mx-auto w-full">
              <ChatInput
                onSend={handleSendMessage}
                disabled={!hasProviders}
                isLoading={isSending || isLoading}
                providers={providers}
              />
              {(isSending || isLoading) && (
                <button
                  onClick={stopGeneration}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Stop generating
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
