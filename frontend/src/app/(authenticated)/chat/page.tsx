"use client"

import * as React from "react"
import { Spinner } from "@/atoms/spinner"
import { ChatContainer } from "@/components/chat/chat-container"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import type { Provider } from "@/lib/types"

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
  const { user, getAccessToken, isLoading: isUserLoading } = useUser()
  const [providers, setProviders] = React.useState<Provider[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [_fetchAttempted, setFetchAttempted] = React.useState(false)

  React.useEffect(() => {
    async function fetchProviders() {
      try {
        const accessToken = await getAccessToken()

        // If no token available, wait for user to be ready
        if (!accessToken) {
          console.warn('No access token available, will retry when user is ready')
          return
        }

        const response = await authFetch(`/api/providers`, accessToken)

        if (response.ok) {
          const data = await response.json() as { providers: ApiProvider[] }

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
        } else if (response.status === 401) {
          // Auth error - token might be stale, will retry when user updates
          console.warn('Auth error fetching providers, will retry')
          return
        }

        setFetchAttempted(true)
      } catch (error) {
        console.error('Failed to fetch providers:', error)
        setFetchAttempted(true)
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch when user is loaded AND we have a user
    if (!isUserLoading && user) {
      fetchProviders()
    }
  }, [getAccessToken, isUserLoading, user])

  // Show loading while user is loading
  if (isUserLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" className="text-muted-foreground" />
      </div>
    )
  }

  // Key forces remount when navigating from /chat/[id] to /chat
  return <ChatContainer key="new-chat" providers={providers} isLoadingProviders={isLoading} />
}
