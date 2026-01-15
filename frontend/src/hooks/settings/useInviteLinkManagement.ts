"use client"

import * as React from "react"
import { authFetch } from "@/lib/api"
import { OrganizationInviteLink } from "@/lib/types"

interface UseInviteLinkManagementOptions {
  organizationId: string | null
  canManageMembers: boolean
  getAccessToken: () => Promise<string | null>
}

export function useInviteLinkManagement({
  organizationId,
  canManageMembers,
  getAccessToken,
}: UseInviteLinkManagementOptions) {
  const [inviteLink, setInviteLink] = React.useState<OrganizationInviteLink | null>(null)
  const [isLoadingInviteLink, setIsLoadingInviteLink] = React.useState(false)
  const [isRegeneratingLink, setIsRegeneratingLink] = React.useState(false)
  const [linkCopied, setLinkCopied] = React.useState(false)

  // Fetch invite link
  const fetchInviteLink = React.useCallback(async () => {
    if (!organizationId) return
    setIsLoadingInviteLink(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const accessToken = await getAccessToken()
      const response = await authFetch(`${apiUrl}/api/invite-links`, accessToken)
      if (response.ok) {
        const data = await response.json()
        setInviteLink(data.link || null)
      }
    } catch (error) {
      console.error("Failed to fetch invite link:", error)
    } finally {
      setIsLoadingInviteLink(false)
    }
  }, [organizationId, getAccessToken])

  // Fetch invite link when org is selected and user is admin
  React.useEffect(() => {
    if (organizationId && canManageMembers) {
      fetchInviteLink()
    } else {
      setInviteLink(null)
    }
  }, [organizationId, canManageMembers, fetchInviteLink])

  // Create or regenerate invite link
  const createOrRegenerateLink = async () => {
    if (!organizationId) return
    setIsRegeneratingLink(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const accessToken = await getAccessToken()
      const response = await authFetch(`${apiUrl}/api/invite-links`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ role: 'member' }),
      })
      if (response.ok) {
        const data = await response.json()
        setInviteLink(data.link || null)
      }
    } catch (error) {
      console.error("Failed to create invite link:", error)
    } finally {
      setIsRegeneratingLink(false)
    }
  }

  // Copy invite link to clipboard
  const copyInviteLink = async () => {
    if (!inviteLink?.url) return
    try {
      await navigator.clipboard.writeText(inviteLink.url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
    }
  }

  return {
    inviteLink,
    isLoadingInviteLink,
    isRegeneratingLink,
    linkCopied,
    createOrRegenerateLink,
    copyInviteLink,
    fetchInviteLink,
  }
}
