"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChatHeader } from "./chat-header"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ExamplePrompts } from "./example-prompts"
import { ChatSettingsPanel } from "./chat-settings-panel"
import { streamChat } from "@/lib/api"
import { authClient } from "@/lib/auth-client"
import type { Message, Provider, StreamEventItem } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ChatContainerProps {
  initialMessages?: Message[]
  providers?: Provider[]
  sessionId?: string
}

export function ChatContainer({ initialMessages = [], providers = [], sessionId: initialSessionId }: ChatContainerProps) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [messages, setMessages] = React.useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(initialSessionId || null)
  const [enabledProviders, setEnabledProviders] = React.useState<string[]>(
    providers.filter(p => p.status === "connected").map(p => p.id)
  )
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const hasProviders = providers.some(p => p.status === "connected")
  const hasMessages = messages.length > 0
  const userId = session?.user?.id

  // Create a new chat session
  const createSession = async (title?: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_URL}/api/chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  // Save a message to the database
  const saveMessage = async (sessionId: string, role: 'user' | 'assistant', content: string, metadata?: Record<string, unknown>) => {
    try {
      await fetch(`${API_URL}/api/chat/session/${sessionId}/save-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, role, metadata }),
      })
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !hasProviders) return

    // Cancel any pending request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    // Create a session if this is the first message
    let sessionId = currentSessionId
    if (!sessionId) {
      // Use first ~50 chars of message as title
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
      sessionId = await createSession(title)
      if (sessionId) {
        setCurrentSessionId(sessionId)
        // Update URL using history API to avoid component remount
        window.history.replaceState(null, '', `/chat/${sessionId}`)
      }
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    }

    // Create assistant message placeholder
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

    // Save user message to database (don't await to avoid blocking UI)
    if (sessionId) {
      saveMessage(sessionId, 'user', content)
    }

    // Track sequential events
    const events: StreamEventItem[] = []
    // Also track legacy format for saving to DB
    const toolCalls: { name: string; params: Record<string, unknown> }[] = []
    const toolResults: { name: string; result: unknown }[] = []
    let finalContent = ""

    await streamChat(
      content,
      {
        onRouting: (service, capability) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, agentName: `${service} / ${capability}` }
                : m
            )
          )
        },
        onAgent: (agent, task) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, agentName: agent || m.agentName }
                : m
            )
          )
        },
        onThinking: (thinkingContent) => {
          // Add each thinking event separately for sequential display
          events.push({ type: "thinking", content: thinkingContent })
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, events: [...events] }
                : m
            )
          )
        },
        onToolCall: (tool, inputPreview, inputFull) => {
          let params: Record<string, unknown> = {}
          try {
            const inputStr = inputFull || inputPreview
            if (inputStr) {
              params = JSON.parse(inputStr)
            }
          } catch {
            params = { input: inputPreview }
          }

          // Add to sequential events
          events.push({ type: "tool", name: tool, params })
          // Also track for legacy saving
          toolCalls.push({ name: tool, params })

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, events: [...events] }
                : m
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

          // Add to sequential events
          events.push({ type: "tool_result", name: lastToolCall?.name || "unknown", result })
          // Also track for legacy saving
          toolResults.push({ name: lastToolCall?.name || "unknown", result })

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, events: [...events] }
                : m
            )
          )
        },
        onResult: (resultContent) => {
          finalContent = resultContent
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: resultContent }
                : m
            )
          )
        },
        onError: (error) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: `Error: ${error}` }
                : m
            )
          )
          setIsLoading(false)
        },
        onDone: () => {
          setIsLoading(false)
          // Save assistant message to database
          if (sessionId && finalContent) {
            const allThinking = events
              .filter((e): e is StreamEventItem & { type: "thinking" } => e.type === "thinking")
              .map(e => e.content)
              .join("\n\n")

            saveMessage(sessionId, 'assistant', finalContent, {
              thinking: allThinking,
              toolCalls,
              toolResults,
              events, // Save sequential events for proper display on reload
            })
          }
        },
      },
      abortControllerRef.current.signal,
      userId // Pass user ID for OAuth token fetching
    )

    setIsLoading(false)
  }

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  const handleToggleProvider = (providerId: string) => {
    setEnabledProviders(prev =>
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    )
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <ChatHeader
          onSettingsClick={() => setSettingsOpen(true)}
          hasProviders={hasProviders}
        />
      </div>

      <ChatSettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        providers={providers}
        enabledProviders={enabledProviders}
        onToggleProvider={handleToggleProvider}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {!hasMessages ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
            <div className="max-w-xl w-full space-y-5">
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

              <div className="max-w-lg mx-auto w-full">
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={!hasProviders}
                  isLoading={isLoading}
                  placeholder={hasProviders ? "Ask anything about your ads..." : "Connect a provider first"}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <ChatMessages messages={messages} isLoading={isLoading} />
            </div>
            {/* Sticky Input at Bottom */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/30 px-6 py-3">
              <div className="max-w-6xl mx-auto w-full">
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={!hasProviders}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
