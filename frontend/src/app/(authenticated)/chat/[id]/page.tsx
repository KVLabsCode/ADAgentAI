"use client"

import * as React from "react"
import { use } from "react"
import { Loader2 } from "lucide-react"
import { ChatContainer } from "@/components/chat/chat-container"
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

export default function ChatSessionPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id: sessionId } = use(params)
  const [providers, setProviders] = React.useState<Provider[]>([])
  const [messages, setMessages] = React.useState<Message[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      try {
        // Fetch providers and session messages in parallel
        const [providersRes, sessionRes] = await Promise.all([
          fetch(`${API_URL}/api/providers`, { credentials: 'include' }),
          fetch(`${API_URL}/api/chat/session/${sessionId}`, { credentials: 'include' }),
        ])

        if (providersRes.ok) {
          const data = await providersRes.json() as { providers: ApiProvider[] }
          const mappedProviders: Provider[] = data.providers.map((p) => ({
            id: p.id,
            type: p.type,
            status: "connected" as const,
            displayName: p.name,
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

    fetchData()
  }, [sessionId])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <ChatContainer
        providers={providers}
        initialMessages={messages}
        sessionId={sessionId}
      />
    </div>
  )
}
