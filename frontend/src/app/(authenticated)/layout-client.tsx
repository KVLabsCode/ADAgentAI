"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Spinner } from "@/atoms/spinner"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/organisms/sidebar"
import { useUser } from "@/hooks/use-user"
import { TosModal } from "@/components/tos-modal"
import { InvitationBanner } from "@/components/invitations"

export function AuthenticatedLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
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
        <Spinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  // Don't render if waitlist access is denied
  if (hasWaitlistAccess === false) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" className="text-muted-foreground" />
      </div>
    )
  }

  // Show ToS modal if user hasn't accepted (but is authenticated and has waitlist access)
  const showTosModal = hasAcceptedTos === false

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="relative overflow-y-auto">
        {/* Mobile sidebar trigger - only visible on small screens */}
        <div className="sticky top-0 z-50 flex h-12 shrink-0 items-center px-4 sm:px-6 md:hidden bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger />
        </div>
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
