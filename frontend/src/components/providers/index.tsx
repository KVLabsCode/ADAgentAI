"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { NeonAuthUIProvider } from "@neondatabase/auth/react"
import { authClient } from "@/lib/neon-auth/client"
import { ThemeProvider } from "./theme-provider"
import { QueryProvider } from "./query-provider"
import { PostHogProvider } from "./posthog-provider"
import { UserProvider } from "@/contexts/user-context"
import { EntityDataProvider } from "@/contexts/entity-data-context"

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <PostHogProvider>
      <QueryProvider>
        <NeonAuthUIProvider
          authClient={authClient}
          navigate={router.push}
          replace={router.replace}
          onSessionChange={() => router.refresh()}
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
