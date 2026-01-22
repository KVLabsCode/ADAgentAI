"use client"

import * as React from "react"
import { Spinner } from "@/atoms/spinner"
import { SettingsSection, ConfigFieldGroup } from "@/organisms/theme"
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
    <SettingsSection title="Invitations To You">
      {isLoadingInvitations ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" className="text-muted-foreground" />
        </div>
      ) : (
        <ConfigFieldGroup>
          {successMessage && (
            <p className="text-xs text-success bg-success/10 px-[var(--item-padding-x)] py-[var(--item-padding-y)] rounded">
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
        </ConfigFieldGroup>
      )}
    </SettingsSection>
  )
}
