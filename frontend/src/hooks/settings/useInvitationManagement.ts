"use client"

import * as React from "react"
import { authClient } from "@/lib/neon-auth/client"
import { DEMO_ORGANIZATION } from "@/lib/demo-user"

// Demo mode check - skip API calls for demo organization
const isDemoOrg = (orgId: string | null) => orgId === DEMO_ORGANIZATION.id

interface PendingInvitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date
  organizationId: string
}

interface UseInvitationManagementOptions {
  organizationId: string | null
  organizationName?: string
  onInviteSent?: () => void
}

export function useInvitationManagement({
  organizationId,
  organizationName,
  onInviteSent,
}: UseInvitationManagementOptions) {
  // Invite form state
  const [inviteUsername, setInviteUsername] = React.useState("")
  const [inviteDomain, setInviteDomain] = React.useState("gmail.com")
  const [inviteRole, setInviteRole] = React.useState<"member" | "admin">("admin")
  const [isInviting, setIsInviting] = React.useState(false)
  const [inviteError, setInviteError] = React.useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = React.useState(false)

  // Copy invite message modal state
  const [showInviteMessageModal, setShowInviteMessageModal] = React.useState(false)
  const [invitedEmail, setInvitedEmail] = React.useState<string | null>(null)
  const [inviteMessageCopied, setInviteMessageCopied] = React.useState(false)

  // Pending invitations state
  const [pendingInvites, setPendingInvites] = React.useState<PendingInvitation[]>([])
  const [isLoadingInvites, setIsLoadingInvites] = React.useState(false)
  const [cancellingInviteId, setCancellingInviteId] = React.useState<string | null>(null)
  const [resendingInviteId, setResendingInviteId] = React.useState<string | null>(null)

  // Fetch pending invitations
  const fetchPendingInvites = React.useCallback(async () => {
    if (!organizationId || isDemoOrg(organizationId)) return
    setIsLoadingInvites(true)
    try {
      const response = await authClient.organization.listInvitations({
        query: { organizationId },
      })
      if (response.data) {
        const inviteList = Array.isArray(response.data)
          ? response.data
          : (response.data as { invitations?: PendingInvitation[] }).invitations || []
        setPendingInvites(inviteList.filter((inv: PendingInvitation) => inv.status === "pending"))
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error)
    } finally {
      setIsLoadingInvites(false)
    }
  }, [organizationId])

  // Fetch invites when org is selected
  React.useEffect(() => {
    if (organizationId) {
      fetchPendingInvites()
    } else {
      setPendingInvites([])
    }
  }, [organizationId, fetchPendingInvites])

  const sendInvite = async (email: string) => {
    if (!email || !organizationId || isDemoOrg(organizationId)) return
    setIsInviting(true)
    setInviteError(null)
    setInviteSuccess(false)
    try {
      await authClient.organization.inviteMember({
        email,
        role: inviteRole,
      })
      // Show copy invite message modal
      setInvitedEmail(email)
      setShowInviteMessageModal(true)
      setInviteMessageCopied(false)
      setInviteUsername("")
      setInviteSuccess(true)
      fetchPendingInvites()
      onInviteSent?.()
      setTimeout(() => setInviteSuccess(false), 3000)
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Failed to send invite")
    } finally {
      setIsInviting(false)
    }
  }

  const cancelInvite = async (invitationId: string) => {
    setCancellingInviteId(invitationId)
    try {
      await authClient.organization.cancelInvitation({ invitationId })
      fetchPendingInvites()
    } catch (error) {
      console.error("Failed to cancel invitation:", error)
    } finally {
      setCancellingInviteId(null)
    }
  }

  const resendInvite = async (invitation: PendingInvitation) => {
    setResendingInviteId(invitation.id)
    try {
      await authClient.organization.cancelInvitation({ invitationId: invitation.id })
      await authClient.organization.inviteMember({
        email: invitation.email,
        role: invitation.role as "member" | "admin",
      })
      fetchPendingInvites()
    } catch (error) {
      console.error("Failed to resend invitation:", error)
    } finally {
      setResendingInviteId(null)
    }
  }

  const copyInviteMessage = async () => {
    if (!invitedEmail || !organizationName) return
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const message = `I invited you to ${organizationName} on ADAgent!\n\nSign in with Google (${invitedEmail}) to accept:\n${baseUrl}/login`
    try {
      await navigator.clipboard.writeText(message)
      setInviteMessageCopied(true)
    } catch (error) {
      console.error("Failed to copy message:", error)
    }
  }

  const closeInviteMessageModal = () => {
    setShowInviteMessageModal(false)
    setInviteMessageCopied(false)
  }

  return {
    // Invite form
    inviteUsername,
    setInviteUsername,
    inviteDomain,
    setInviteDomain,
    inviteRole,
    setInviteRole,
    isInviting,
    inviteError,
    inviteSuccess,
    sendInvite,
    // Invite message modal
    showInviteMessageModal,
    invitedEmail,
    inviteMessageCopied,
    copyInviteMessage,
    closeInviteMessageModal,
    // Pending invitations
    pendingInvites,
    isLoadingInvites,
    cancellingInviteId,
    resendingInviteId,
    cancelInvite,
    resendInvite,
    fetchPendingInvites,
  }
}
