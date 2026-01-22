"use client"

import * as React from "react"
import { Spinner } from "@/atoms/spinner"
import { ChatContainer } from "@/components/chat/chat-container"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
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
  const { getAccessToken, isLoading: isUserLoading } = useUser()
  const [providers, setProviders] = React.useState<Provider[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchProviders() {
      try {
        const accessToken = await getAccessToken()
        const response = await authFetch(`${API_URL}/api/providers`, accessToken)

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

    if (!isUserLoading) {
      fetchProviders()
    }
  }, [getAccessToken, isUserLoading])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" className="text-muted-foreground" />
      </div>
    )
  }

  // Key forces remount when navigating from /chat/[id] to /chat
  return <ChatContainer key="new-chat" providers={providers} />
}
