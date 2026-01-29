"use client"

import * as React from "react"
import { Spinner } from "@/atoms/spinner"
import { ChatContainer } from "@/components/chat/chat-container"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import type { Provider, Message, StreamEventItem } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ApiProvider {
  id: string
  type: "admob" | "gam"
  name: string
  identifier: string
  isEnabled: boolean
  lastSyncAt: string | null
  connectedAt: string
}

interface ApiMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  agentName?: string
  createdAt: string
  // Metadata contains events (new) and legacy fields
  metadata?: {
    events?: StreamEventItem[]
    thinking?: string
    toolCalls?: { name: string; params: Record<string, unknown> }[]
    toolResults?: { name: string; result: unknown }[]
  }
}

interface ChatSessionClientProps {
  sessionId: string
}

export function ChatSessionClient({ sessionId }: ChatSessionClientProps) {
  const { user, getAccessToken, isLoading: isUserLoading } = useUser()
  const [providers, setProviders] = React.useState<Provider[]>([])
  const [messages, setMessages] = React.useState<Message[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      try {
        const accessToken = await getAccessToken()

        // If no token available, wait for user to be ready
        if (!accessToken) {
          console.warn('No access token available, will retry when user is ready')
          return
        }

        // Fetch providers and session messages in parallel
        const [providersRes, sessionRes] = await Promise.all([
          authFetch(`${API_URL}/api/providers`, accessToken),
          authFetch(`${API_URL}/api/chat/session/${sessionId}`, accessToken),
        ])

        // Check for auth errors
        if (providersRes.status === 401 || sessionRes.status === 401) {
          console.warn('Auth error fetching chat session, will retry')
          return
        }

        if (providersRes.ok) {
          const data = await providersRes.json() as { providers: ApiProvider[] }
          const mappedProviders: Provider[] = data.providers.map((p) => ({
            id: p.id,
            type: p.type,
            status: "connected" as const,
            displayName: p.name,
            isEnabled: p.isEnabled,
            identifiers: p.type === "admob"
              ? { publisherId: p.identifier }
              : { networkCode: p.identifier, accountName: p.name },
          }))
          setProviders(mappedProviders)
        }

        if (sessionRes.ok) {
          const data = await sessionRes.json() as { session: { messages: ApiMessage[] } }
          const mappedMessages: Message[] = (data.session?.messages || []).map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            agentName: m.agentName,
            createdAt: m.createdAt,
            // Use events array if available (new format), otherwise fall back to legacy
            events: m.metadata?.events,
            // Legacy fields for backward compatibility
            hasThinking: !!m.metadata?.thinking,
            thinking: m.metadata?.thinking,
            hasToolCalls: !!(m.metadata?.toolCalls && m.metadata.toolCalls.length > 0),
            toolCalls: m.metadata?.toolCalls,
            toolResults: m.metadata?.toolResults,
          }))
          setMessages(mappedMessages)
        }
      } catch (error) {
        console.error('Failed to fetch chat session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch when user is loaded AND we have a user
    if (!isUserLoading && user) {
      fetchData()
    }
  }, [sessionId, getAccessToken, isUserLoading, user])

  // Show loading while user or data is loading
  if (isUserLoading || isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="sm" className="text-muted-foreground" />
      </div>
    )
  }

  return (
    <ChatContainer
      key={sessionId}
      providers={providers}
      initialMessages={messages}
      sessionId={sessionId}
    />
  )
}
