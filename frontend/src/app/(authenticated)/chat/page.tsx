"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { ChatContainer } from "@/components/chat/chat-container"
import type { Provider } from "@/lib/types"

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

export default function ChatPage() {
  const [providers, setProviders] = React.useState<Provider[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch(`${API_URL}/api/providers`, {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json() as { providers: ApiProvider[] }

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
      } catch (error) {
        console.error('Failed to fetch providers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProviders()
  }, [])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <ChatContainer providers={providers} />
}
