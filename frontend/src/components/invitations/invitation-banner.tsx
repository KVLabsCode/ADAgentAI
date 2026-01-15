"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Mail, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReceivedInvitation } from "@/lib/types"
import { InvitationCard } from "./invitation-card"

interface InvitationBannerProps {
  invitations: ReceivedInvitation[]
  onAccept: (invitationId: string) => Promise<boolean>
  onReject: (invitationId: string) => Promise<boolean>
  onDismiss: () => void
}

export function InvitationBanner({
  invitations,
  onAccept,
  onReject,
  onDismiss,
}: InvitationBannerProps) {
  const router = useRouter()
  const [acceptedIds, setAcceptedIds] = React.useState<Set<string>>(new Set())

  // Filter out accepted invitations for display
  const visibleInvitations = invitations.filter(inv => !acceptedIds.has(inv.id))

  // Don't render if no invitations
  if (visibleInvitations.length === 0) {
    return null
  }

  const handleAccept = async (invitationId: string) => {
    const success = await onAccept(invitationId)
    if (success) {
      // Mark as accepted locally for immediate UI feedback
      setAcceptedIds(prev => new Set([...prev, invitationId]))
    }
  }

  const handleReject = async (invitationId: string) => {
    await onReject(invitationId)
  }

  // Show summary if 3+ invitations
  if (visibleInvitations.length >= 3) {
    return (
      <div className="mx-4 mt-2 mb-0 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">
                You have {visibleInvitations.length} pending organization invitations
              </p>
              <p className="text-xs text-muted-foreground">
                Review and accept to join organizations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => router.push('/settings')}
              className="h-8"
            >
              View Invitations
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show 1-2 invitations inline
  return (
    <div className="mx-4 mt-2 mb-0 space-y-2 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          <span>Pending invitation{visibleInvitations.length > 1 ? 's' : ''}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {visibleInvitations.map((invitation) => (
        <InvitationCard
          key={invitation.id}
          invitation={invitation}
          onAccept={() => handleAccept(invitation.id)}
          onReject={() => handleReject(invitation.id)}
          variant="compact"
        />
      ))}
    </div>
  )
}
