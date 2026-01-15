"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Sun, Loader2 } from "lucide-react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { ModelSelector } from "@/components/layout/model-selector"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { TosModal } from "@/components/tos-modal"
import { InvitationBanner } from "@/components/invitations"

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-6 w-11 rounded-full bg-muted/50 animate-pulse" />
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative h-6 w-11 rounded-full p-0.5 transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDark ? "bg-slate-700" : "bg-amber-100"
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Sliding circle with icon */}
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full shadow-sm transition-all duration-300 ease-in-out",
          isDark
            ? "translate-x-5 bg-slate-900"
            : "translate-x-0 bg-white"
        )}
      >
        <Sun
          className={cn(
            "h-3 w-3 text-amber-500 transition-all duration-300",
            isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
          )}
        />
        <Moon
          className={cn(
            "absolute h-3 w-3 text-slate-300 transition-all duration-300",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
          )}
        />
      </span>
    </button>
  )
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    isLoading,
    isAuthenticated,
    hasWaitlistAccess,
    isCheckingWaitlist,
    hasAcceptedTos,
    isCheckingTos,
    receivedInvitations,
    acceptInvitation,
    rejectInvitation,
  } = useUser()

  // Track if we've completed initial auth check to prevent flashing on subsequent updates
  const [hasInitialized, setHasInitialized] = React.useState(false)

  // Track if invitation banner is dismissed (per-session)
  const [isBannerDismissed, setIsBannerDismissed] = React.useState(false)

  // Only show model selector on chat pages
  const showModelSelector = pathname === "/chat" || pathname.startsWith("/chat/")

  // Mark as initialized once we've completed the first auth check
  React.useEffect(() => {
    if (!isLoading && !isCheckingWaitlist && !isCheckingTos) {
      setHasInitialized(true)
    }
  }, [isLoading, isCheckingWaitlist, isCheckingTos])

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Redirect to access denied if user doesn't have waitlist access
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isCheckingWaitlist && hasWaitlistAccess === false) {
      router.push('/access-denied')
    }
  }, [isLoading, isAuthenticated, isCheckingWaitlist, hasWaitlistAccess, router])

  // Show loading state only during initial load, not on subsequent re-checks
  if (!hasInitialized && (isLoading || isCheckingWaitlist || isCheckingTos)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Don't render if waitlist access is denied
  if (hasWaitlistAccess === false) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show ToS modal if user hasn't accepted (but is authenticated and has waitlist access)
  const showTosModal = hasAcceptedTos === false

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="relative overflow-y-auto">
        <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center justify-between border-b border-border/30 px-4 sm:px-6 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            {showModelSelector && <ModelSelector />}
          </div>
          <ThemeToggle />
        </header>
        {/* Invitation Banner - shows if user has pending invitations */}
        {receivedInvitations.length > 0 && !isBannerDismissed && (
          <InvitationBanner
            invitations={receivedInvitations}
            onAccept={acceptInvitation}
            onReject={rejectInvitation}
            onDismiss={() => setIsBannerDismissed(true)}
          />
        )}
        <div className="flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </SidebarInset>
      {/* Terms of Service Modal */}
      <TosModal open={showTosModal} />
    </SidebarProvider>
  )
}
