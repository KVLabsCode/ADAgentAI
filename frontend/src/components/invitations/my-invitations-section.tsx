"use client"

import * as React from "react"
import { Mail, Loader2, Inbox } from "lucide-react"
import {
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
} from "@/components/ui/theme"
import { useUser } from "@/hooks/use-user"
import { InvitationCard } from "./invitation-card"

export function MyInvitationsSection() {
  const {
    receivedInvitations,
    isLoadingInvitations,
    acceptInvitation,
    rejectInvitation,
  } = useUser()

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const handleAccept = async (invitationId: string, orgName: string) => {
    const success = await acceptInvitation(invitationId)
    if (success) {
      setSuccessMessage(`You've joined ${orgName}!`)
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  const handleReject = async (invitationId: string) => {
    await rejectInvitation(invitationId)
  }

  // Don't show section if no invitations and not loading
  if (!isLoadingInvitations && receivedInvitations.length === 0) {
    return null
  }

  return (
    <SectionCard>
      <SectionCardHeader
        icon={Mail}
        title="Invitations To You"
        description="Organization invitations you've received"
      />
      <SectionCardContent className="space-y-3">
        {isLoadingInvitations ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : receivedInvitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No pending invitations</p>
          </div>
        ) : (
          <>
            {successMessage && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded">
                {successMessage}
              </p>
            )}
            {receivedInvitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onAccept={() => handleAccept(invitation.id, invitation.organizationName)}
                onReject={() => handleReject(invitation.id)}
                variant="full"
              />
            ))}
          </>
        )}
      </SectionCardContent>
    </SectionCard>
  )
}
