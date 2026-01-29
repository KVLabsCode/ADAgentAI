"use client"

import * as React from "react"
import { useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { NeonAuthUIProvider } from "@neondatabase/auth/react"
import { authClient } from "@/lib/neon-auth/client"
import { ThemeProvider } from "./theme-provider"
import { QueryProvider, getQueryClient } from "./query-provider"
import { PostHogProvider } from "./posthog-provider"
import { UserProvider } from "@/contexts/user-context"
import { EntityDataProvider } from "@/contexts/entity-data-context"

// Re-export provider management components
export { ConnectProviderDropdown } from "./ConnectProviderDropdown"
export { ProviderListItem } from "./ProviderListItem"
export { SupportedPlatformsContent, AllPlatformsGrid, ALL_PLATFORMS } from "./SupportedPlatformsCard"
export { AccountSelectionModal } from "./account-selection-modal"
export { NetworkCredentialDialog } from "./NetworkCredentialDialog"
export { NetworkListItem } from "./NetworkListItem"

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  // Use targeted cache invalidation instead of router.refresh()
  // This prevents the "numbers zeroing" issue caused by full cache invalidation
  const handleSessionChange = useCallback(() => {
    const queryClient = getQueryClient()
    // Invalidate auth-related queries to refetch user data
    queryClient.invalidateQueries({ queryKey: ['user'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['providers'] })
  }, [])

  return (
    <PostHogProvider>
      <QueryProvider>
        <NeonAuthUIProvider
          authClient={authClient}
          navigate={router.push}
          replace={router.replace}
          onSessionChange={handleSessionChange}
          social={{ providers: ["google"] }}
          redirectTo="/dashboard"
          Link={Link}
        >
          <UserProvider>
            <EntityDataProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </EntityDataProvider>
          </UserProvider>
        </NeonAuthUIProvider>
      </QueryProvider>
    </PostHogProvider>
  )
}
