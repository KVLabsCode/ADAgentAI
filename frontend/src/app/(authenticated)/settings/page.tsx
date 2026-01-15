"use client"

import * as React from "react"
import Image from "next/image"
import { Moon, Sun, Monitor, Bell, Shield, User, MessageSquare, Building2, UserPlus, Trash2, Crown, ShieldCheck, Users, Loader2, Send, Mail, X, Clock, Pencil, AlertTriangle, Download, Link2, Copy, Check, RefreshCw } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GmailEmailInput, getFullEmail } from "@/components/ui/gmail-email-input"
import {
  PageContainer,
  PageHeader,
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
  ConfigField,
} from "@/components/ui/theme"
import { useChatSettings } from "@/lib/chat-settings"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import { authClient } from "@/lib/neon-auth/client"
import { OrganizationMember, OrganizationInviteLink } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MyInvitationsSection } from "@/components/invitations"

// Type for pending invitations
interface PendingInvitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date
  organizationId: string
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { displayMode, setDisplayMode } = useChatSettings()
  const { selectedOrganization, selectedOrganizationId, selectedOrgRole, user, getAccessToken, signOut } = useUser()
  const [mounted, setMounted] = React.useState(false)

  // Organization management state
  const [members, setMembers] = React.useState<OrganizationMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false)
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

  // Invite link state
  const [inviteLink, setInviteLink] = React.useState<OrganizationInviteLink | null>(null)
  const [isLoadingInviteLink, setIsLoadingInviteLink] = React.useState(false)
  const [isRegeneratingLink, setIsRegeneratingLink] = React.useState(false)
  const [linkCopied, setLinkCopied] = React.useState(false)

  // Organization settings state
  const [isEditingOrgName, setIsEditingOrgName] = React.useState(false)
  const [newOrgName, setNewOrgName] = React.useState("")
  const [isUpdatingOrg, setIsUpdatingOrg] = React.useState(false)
  const [isDeletingOrg, setIsDeletingOrg] = React.useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("")
  const [orgError, setOrgError] = React.useState<string | null>(null)

  // Role change state
  const [changingRoleMemberId, setChangingRoleMemberId] = React.useState<string | null>(null)
  const [editingMemberId, setEditingMemberId] = React.useState<string | null>(null)
  const [pendingRole, setPendingRole] = React.useState<"member" | "admin" | null>(null)

  // Delete account state
  const [deleteAccountConfirmEmail, setDeleteAccountConfirmEmail] = React.useState("")
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false)
  const [deleteAccountError, setDeleteAccountError] = React.useState<string | null>(null)

  // Data export state
  const [isExportingData, setIsExportingData] = React.useState(false)

  // Chat history deletion state
  const [isDeletingChatHistory, setIsDeletingChatHistory] = React.useState(false)
  const [chatHistoryDeleteSuccess, setChatHistoryDeleteSuccess] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const fetchMembers = React.useCallback(async () => {
    if (!selectedOrganizationId) return
    setIsLoadingMembers(true)
    try {
      // Ensure active org is set before listing members
      await authClient.organization.setActive({
        organizationId: selectedOrganizationId,
      })
      const response = await authClient.organization.listMembers({
        query: {
          limit: 100,
        },
      })
      if (response.data) {
        // Response may be { members: [...] } or direct array
        const memberList = Array.isArray(response.data)
          ? response.data
          : (response.data as { members?: Array<{ id: string; userId: string; organizationId: string; role: string; createdAt: Date; user?: { id: string; name: string | null; email: string; image: string | null } }> }).members || []

        setMembers(memberList.map((m) => ({
          id: m.id,
          userId: m.userId,
          organizationId: m.organizationId,
          role: m.role,
          createdAt: m.createdAt.toString(),
          user: m.user,
        })))
      }
    } catch (error) {
      console.error("Failed to fetch members:", error)
    } finally {
      setIsLoadingMembers(false)
    }
  }, [selectedOrganizationId])

  // Fetch organization members when org is selected
  React.useEffect(() => {
    if (selectedOrganizationId) {
      fetchMembers()
    } else {
      setMembers([])
    }
  }, [selectedOrganizationId, fetchMembers])

  // Fetch pending invitations
  const fetchPendingInvites = React.useCallback(async () => {
    if (!selectedOrganizationId) return
    setIsLoadingInvites(true)
    try {
      const response = await authClient.organization.listInvitations({
        query: {
          organizationId: selectedOrganizationId,
        },
      })
      if (response.data) {
        // Response may be array or object with invitations property
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
  }, [selectedOrganizationId])

  // Fetch invites when org is selected
  React.useEffect(() => {
    if (selectedOrganizationId) {
      fetchPendingInvites()
    } else {
      setPendingInvites([])
    }
  }, [selectedOrganizationId, fetchPendingInvites])

  // Fetch invite link
  const fetchInviteLink = React.useCallback(async () => {
    if (!selectedOrganizationId) return
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
  }, [selectedOrganizationId, getAccessToken])

  // Fetch invite link when org is selected and user is admin
  React.useEffect(() => {
    // Compute admin status inline since canManageMembers is defined later
    const memberRole = members.find(m => m.userId === user?.id)?.role?.toLowerCase()
    const currentRole = memberRole || selectedOrgRole?.toLowerCase() || null
    const isAdmin = currentRole === "owner" || currentRole === "admin"

    if (selectedOrganizationId && isAdmin) {
      fetchInviteLink()
    } else {
      setInviteLink(null)
    }
  }, [selectedOrganizationId, members, user?.id, selectedOrgRole, fetchInviteLink])

  // Create or regenerate invite link
  const handleCreateOrRegenerateLink = async () => {
    if (!selectedOrganizationId) return
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
  const handleCopyInviteLink = async () => {
    if (!inviteLink?.url) return
    try {
      await navigator.clipboard.writeText(inviteLink.url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
    }
  }

  // Initialize org name for editing
  React.useEffect(() => {
    if (selectedOrganization) {
      setNewOrgName(selectedOrganization.name)
    }
  }, [selectedOrganization])

  const handleInvite = async () => {
    const email = getFullEmail(inviteUsername, inviteDomain)
    if (!email || !selectedOrganizationId) return
    setIsInviting(true)
    setInviteError(null)
    setInviteSuccess(false)
    try {
      // Active org is already set by fetchMembers, just call invite
      await authClient.organization.inviteMember({
        email,
        role: inviteRole,
      })
      // Show copy invite message modal (set before clearing input)
      setInvitedEmail(email)
      setShowInviteMessageModal(true)
      setInviteMessageCopied(false)

      setInviteUsername("")
      setInviteSuccess(true)
      fetchPendingInvites() // Refresh pending invites list

      setTimeout(() => setInviteSuccess(false), 3000)
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Failed to send invite")
    } finally {
      setIsInviting(false)
    }
  }

  // Copy invite message to clipboard
  const handleCopyInviteMessage = async () => {
    if (!invitedEmail || !selectedOrganization) return
    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin
    const message = `I invited you to ${selectedOrganization.name} on ADAgent!\n\nSign in with Google (${invitedEmail}) to accept:\n${baseUrl}/login`
    try {
      await navigator.clipboard.writeText(message)
      setInviteMessageCopied(true)
    } catch (error) {
      console.error("Failed to copy message:", error)
    }
  }

  const handleCancelInvite = async (invitationId: string) => {
    setCancellingInviteId(invitationId)
    try {
      await authClient.organization.cancelInvitation({
        invitationId,
      })
      fetchPendingInvites()
    } catch (error) {
      console.error("Failed to cancel invitation:", error)
    } finally {
      setCancellingInviteId(null)
    }
  }

  const handleResendInvite = async (invitation: PendingInvitation) => {
    setResendingInviteId(invitation.id)
    try {
      // Cancel old invite and send new one
      await authClient.organization.cancelInvitation({
        invitationId: invitation.id,
      })
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

  const handleUpdateOrgName = async () => {
    if (!selectedOrganizationId || !newOrgName.trim()) return
    setIsUpdatingOrg(true)
    setOrgError(null)
    try {
      await authClient.organization.update({
        data: {
          name: newOrgName.trim(),
          slug: newOrgName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        },
        organizationId: selectedOrganizationId,
      })
      setIsEditingOrgName(false)
      // Refresh the page to update org name everywhere
      window.location.reload()
    } catch (error) {
      setOrgError(error instanceof Error ? error.message : "Failed to update organization")
    } finally {
      setIsUpdatingOrg(false)
    }
  }

  const handleDeleteOrg = async () => {
    if (!selectedOrganizationId) return
    setIsDeletingOrg(true)
    setOrgError(null)
    try {
      await authClient.organization.delete({
        organizationId: selectedOrganizationId,
      })
      // Redirect to dashboard after deletion
      window.location.href = "/dashboard"
    } catch (error) {
      setOrgError(error instanceof Error ? error.message : "Failed to delete organization")
      setIsDeletingOrg(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedOrganizationId) return
    if (!confirm("Are you sure you want to remove this member?")) return
    try {
      // Active org is already set, just call remove
      await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
      })
      fetchMembers()
    } catch (error) {
      console.error("Failed to remove member:", error)
    }
  }

  // Start editing a member's role
  const handleStartEditRole = (memberId: string, currentRole: string) => {
    setEditingMemberId(memberId)
    setPendingRole(currentRole as "member" | "admin")
  }

  // Cancel editing
  const handleCancelEditRole = () => {
    setEditingMemberId(null)
    setPendingRole(null)
  }

  // Save role change (org admin only feature)
  const handleSaveRole = async (memberId: string) => {
    if (!selectedOrganizationId || !pendingRole) return
    setChangingRoleMemberId(memberId)
    try {
      await authClient.organization.updateMemberRole({
        memberId,
        role: pendingRole,
        organizationId: selectedOrganizationId,
      })
      fetchMembers()
      setEditingMemberId(null)
      setPendingRole(null)
    } catch (error) {
      console.error("Failed to change member role:", error)
    } finally {
      setChangingRoleMemberId(null)
    }
  }

  // Data export handler (GDPR Article 20: Right to Data Portability)
  const handleExportData = async () => {
    setIsExportingData(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const accessToken = await getAccessToken()
      const response = await authFetch(`${apiUrl}/api/account/export`, accessToken)

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const data = await response.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `adagent-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export data:", error)
    } finally {
      setIsExportingData(false)
    }
  }

  // Chat history deletion handler
  const handleDeleteChatHistory = async () => {
    setIsDeletingChatHistory(true)
    setChatHistoryDeleteSuccess(false)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const accessToken = await getAccessToken()
      const response = await authFetch(`${apiUrl}/api/account/chat-history`, accessToken, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete chat history')
      }

      setChatHistoryDeleteSuccess(true)
      // Auto-hide success message after 3 seconds
      setTimeout(() => setChatHistoryDeleteSuccess(false), 3000)
    } catch (error) {
      console.error("Failed to delete chat history:", error)
    } finally {
      setIsDeletingChatHistory(false)
    }
  }

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (!user?.email) return
    if (deleteAccountConfirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      setDeleteAccountError("Email doesn't match your account email")
      return
    }

    setIsDeletingAccount(true)
    setDeleteAccountError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const accessToken = await getAccessToken()
      const response = await authFetch(`${apiUrl}/api/account`, accessToken, {
        method: 'DELETE',
        body: JSON.stringify({ confirmEmail: deleteAccountConfirmEmail }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete account')
      }

      // Sign out after successful deletion
      await signOut()
    } catch (error) {
      console.error("Failed to delete account:", error)
      setDeleteAccountError(error instanceof Error ? error.message : "Failed to delete account")
      setIsDeletingAccount(false)
    }
  }

  // Use role from members list, or fall back to context (from useActiveOrganization)
  // Normalize to lowercase for consistent comparison
  const memberRole = members.find(m => m.userId === user?.id)?.role?.toLowerCase()
  const currentUserRole = memberRole || selectedOrgRole?.toLowerCase() || null
  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin"

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case "owner": return <Crown className="h-3 w-3 text-amber-500" />
      case "admin": return <ShieldCheck className="h-3 w-3 text-blue-500" />
      default: return <Users className="h-3 w-3 text-muted-foreground" />
    }
  }

  // Show skeleton layout while mounting to prevent flash
  if (!mounted) {
    return (
      <PageContainer>
        <PageHeader
          title="Settings"
          description="Manage your application preferences."
        />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded border border-border/30 p-4 animate-pulse">
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-48 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Manage your application preferences."
      />

      {/* Invitations To You - Shows pending invitations user has received */}
      <MyInvitationsSection />

      {/* Chat Display */}
      <SectionCard>
        <SectionCardHeader
          icon={MessageSquare}
          title="Chat Display"
          description="Configure how agent activity is displayed."
        />
        <SectionCardContent>
          <ConfigField
            label="Compact mode"
            description="Show thinking and tool calls in a single combined box."
          >
            <Switch
              checked={displayMode === "compact"}
              onCheckedChange={(checked) => setDisplayMode(checked ? "compact" : "detailed")}
            />
          </ConfigField>
        </SectionCardContent>
      </SectionCard>

      {/* Organization */}
      <SectionCard>
        <SectionCardHeader
          icon={Building2}
          title="Organization"
          description={selectedOrganization ? `Manage ${selectedOrganization.name}` : "Select an organization to manage"}
        />
        <SectionCardContent className="space-y-4">
          {!selectedOrganization ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Switch to an organization using the sidebar to manage members.
            </p>
          ) : (
            <>
              {/* Share Member Link */}
              {canManageMembers && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <p className="text-xs font-medium">Share Member Link</p>
                    {isLoadingInviteLink && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>

                  {inviteLink ? (
                    <div className="space-y-2">
                      {/* Link input with copy button */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/30 text-xs font-mono overflow-hidden">
                          <span className="truncate text-muted-foreground">{inviteLink.url}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyInviteLink}
                          className="h-9 w-9 p-0 shrink-0"
                        >
                          {linkCopied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {/* Info and regenerate */}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">
                          Anyone with this link can join as Member
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>Used {inviteLink.usageCount} time{inviteLink.usageCount !== 1 ? 's' : ''}</span>
                          <span>·</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCreateOrRegenerateLink}
                            disabled={isRegeneratingLink}
                            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            {isRegeneratingLink ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Regenerate
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground">
                        Create a shareable link that lets anyone join as a Member.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateOrRegenerateLink}
                        disabled={isRegeneratingLink}
                        className="h-8 text-xs"
                      >
                        {isRegeneratingLink ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Link2 className="h-3 w-3 mr-1" />
                        )}
                        Create Invite Link
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Divider for admin invites */}
              {canManageMembers && (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] text-muted-foreground">or invite as Admin</span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
              )}

              {/* Invite Members via Email (Admin role) */}
              {canManageMembers && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <p className="text-xs font-medium">Invite as Admin</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Email input */}
                    <GmailEmailInput
                      value={inviteUsername}
                      onChange={setInviteUsername}
                      domain={inviteDomain}
                      onDomainChange={setInviteDomain}
                      disabled={isInviting}
                      placeholder="username"
                      className="flex-1"
                      showDomainSelector={false}
                    />
                    {/* Role selector - sleek pill style */}
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "member" | "admin")}>
                      <SelectTrigger className="h-9 w-[125px] text-[11px] font-medium shrink-0 rounded-full border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end" className="min-w-[120px]">
                        <SelectItem value="admin" className="text-xs">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3 text-primary" />
                            <span>Admin</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="member" className="text-xs">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>Member</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Send button */}
                    <Button
                      size="sm"
                      onClick={handleInvite}
                      disabled={isInviting || !inviteUsername}
                      className="h-9 w-9 p-0 shrink-0"
                    >
                      {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    They can accept after signing in with Google.
                  </p>
                  {inviteError && (
                    <p className="text-[10px] text-destructive">{inviteError}</p>
                  )}
                  {inviteSuccess && (
                    <p className="text-[10px] text-green-600">Invitation created! They&apos;ll see it after signing in.</p>
                  )}
                </div>
              )}

              {/* Pending Invitations */}
              {canManageMembers && pendingInvites.length > 0 && (
                <div className="border-t border-border/20 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <p className="text-xs font-medium">Pending Invitations</p>
                    </div>
                    {isLoadingInvites && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <div className="space-y-1">
                    {pendingInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-amber-600 dark:text-amber-500" />
                          <div>
                            <p className="text-xs font-medium">{invite.email}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Invited as {invite.role} • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvite(invite)}
                            disabled={resendingInviteId === invite.id}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {resendingInviteId === invite.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Extend
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvite(invite.id)}
                            disabled={cancellingInviteId === invite.id}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {cancellingInviteId === invite.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="border-t border-border/20 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Members</p>
                  {isLoadingMembers && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <div className="space-y-1.5">
                  {members.length === 0 && !isLoadingMembers ? (
                    <p className="text-[10px] text-muted-foreground py-2">No members found.</p>
                  ) : (
                    members.map((member) => {
                      const isEditing = editingMemberId === member.id
                      const canEdit = canManageMembers && member.role !== "owner" && member.userId !== user?.id

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {/* Member avatar */}
                            {member.user?.image ? (
                              <Image
                                src={member.user.image}
                                alt={member.user.name || "Member"}
                                width={32}
                                height={32}
                                className="rounded-full border border-border/50 shrink-0"
                                referrerPolicy="no-referrer"
                                unoptimized
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border/50 shrink-0">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            {/* Role icon with proper spacing - overlapped on avatar */}
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background border border-border/50 -ml-5 shrink-0">
                              {getRoleIcon(member.role)}
                            </div>
                            <div>
                              <p className="text-xs font-medium">{member.user?.name || member.user?.email || "Unknown"}</p>
                              <p className="text-[10px] text-muted-foreground">{member.user?.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              /* Edit mode: dropdown + save/cancel */
                              <>
                                <Select
                                  value={pendingRole || member.role}
                                  onValueChange={(v) => setPendingRole(v as "member" | "admin")}
                                  disabled={changingRoleMemberId === member.id}
                                >
                                  <SelectTrigger className="h-7 w-[125px] text-[11px] font-medium rounded-full border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent align="end" className="min-w-[110px]">
                                    <SelectItem value="admin" className="text-xs">
                                      <div className="flex items-center gap-2">
                                        <Shield className="h-3 w-3 text-primary" />
                                        <span>Admin</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="member" className="text-xs">
                                      <div className="flex items-center gap-2">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        <span>Member</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleSaveRole(member.id)}
                                  disabled={changingRoleMemberId === member.id || pendingRole === member.role}
                                  className="h-7 px-2 text-xs"
                                >
                                  {changingRoleMemberId === member.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEditRole}
                                  className="h-7 px-2 text-xs text-muted-foreground"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              /* View mode: role badge + edit button */
                              <>
                                <span className="text-[10px] text-muted-foreground capitalize px-2 py-1 rounded-md bg-muted border border-border/30">
                                  {member.role}
                                </span>
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStartEditRole(member.id, member.role)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Organization Settings - Owner only */}
              {(currentUserRole === "owner") && (
                <div className="border-t border-border/20 pt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <p className="text-xs font-medium">Organization Settings</p>
                  </div>

                  {/* Rename Organization */}
                  <div className="flex items-center justify-between py-2 px-2 rounded bg-muted/30">
                    <div className="flex-1">
                      <p className="text-xs font-medium">Organization Name</p>
                      {isEditingOrgName ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <Input
                            type="text"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            className="h-7 text-xs flex-1"
                            placeholder="Organization name"
                          />
                          <Button
                            size="sm"
                            onClick={handleUpdateOrgName}
                            disabled={isUpdatingOrg || !newOrgName.trim()}
                            className="h-7 text-xs px-2"
                          >
                            {isUpdatingOrg ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsEditingOrgName(false)
                              setNewOrgName(selectedOrganization?.name || "")
                            }}
                            className="h-7 text-xs px-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {selectedOrganization?.name}
                        </p>
                      )}
                    </div>
                    {!isEditingOrgName && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingOrgName(true)}
                        className="h-7 px-2 text-xs"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Rename
                      </Button>
                    )}
                  </div>

                  {/* Delete Organization */}
                  <div className="flex items-center justify-between py-2 px-2 rounded bg-destructive/5 border border-destructive/20">
                    <div>
                      <p className="text-xs font-medium text-destructive">Delete Organization</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        This will permanently delete the organization and remove all members.
                      </p>
                    </div>
                    <AlertDialog onOpenChange={(open) => !open && setDeleteConfirmText("")}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete Organization
                          </AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-3">
                              <p>
                                Are you sure you want to delete <strong>{selectedOrganization?.name}</strong>? This action cannot be undone. All members will lose access and all organization data will be permanently deleted.
                              </p>
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-foreground">
                                  Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{selectedOrganization?.name}</span> to confirm:
                                </p>
                                <Input
                                  type="text"
                                  value={deleteConfirmText}
                                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                                  placeholder="Type organization name"
                                  className="h-9 text-sm"
                                  autoComplete="off"
                                />
                              </div>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteOrg}
                            disabled={isDeletingOrg || deleteConfirmText !== selectedOrganization?.name}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeletingOrg ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete Organization"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {orgError && (
                    <p className="text-[10px] text-destructive">{orgError}</p>
                  )}
                </div>
              )}
            </>
          )}
        </SectionCardContent>
      </SectionCard>

      {/* Appearance */}
      <SectionCard>
        <SectionCardHeader
          icon={Sun}
          title="Appearance"
          description="Customize how ADAgentAI looks."
        />
        <SectionCardContent>
          <ConfigField
            label="Theme"
            description="Select your preferred color scheme."
          >
            <div className="flex gap-1">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="h-7 text-[11px] px-2"
              >
                <Sun className="h-3 w-3 mr-1" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="h-7 text-[11px] px-2"
              >
                <Moon className="h-3 w-3 mr-1" />
                Dark
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
                className="h-7 text-[11px] px-2"
              >
                <Monitor className="h-3 w-3 mr-1" />
                System
              </Button>
            </div>
          </ConfigField>
        </SectionCardContent>
      </SectionCard>

      {/* Notifications */}
      <SectionCard>
        <SectionCardHeader
          icon={Bell}
          title="Notifications"
          description="Configure how you receive updates."
        />
        <SectionCardContent className="space-y-3">
          <ConfigField
            label="Email notifications"
            description="Receive email updates about your ad performance."
          >
            <Switch defaultChecked />
          </ConfigField>
          <div className="border-t border-border/20 pt-3">
            <ConfigField
              label="Weekly digest"
              description="Get a weekly summary of your ad metrics."
            >
              <Switch />
            </ConfigField>
          </div>
        </SectionCardContent>
      </SectionCard>

      {/* Privacy */}
      <SectionCard>
        <SectionCardHeader
          icon={Shield}
          title="Privacy"
          description="Manage your data and privacy settings."
        />
        <SectionCardContent className="space-y-3">
          <ConfigField
            label="Usage analytics"
            description="Help improve ADAgentAI by sharing anonymous usage data."
          >
            <Switch defaultChecked />
          </ConfigField>
          <div className="border-t border-border/20 pt-3">
            <ConfigField
              label="Chat history"
              description="Store conversation history for future reference."
            >
              <Switch defaultChecked />
            </ConfigField>
          </div>
        </SectionCardContent>
      </SectionCard>

      {/* Account */}
      <SectionCard>
        <SectionCardHeader
          icon={User}
          title="Account"
          description="Manage your account and data."
        />
        <SectionCardContent className="space-y-3">
          {/* Profile with avatar refresh */}
          <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/30 border border-border/20">
            <div className="flex items-center gap-3">
              {/* User avatar */}
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name || "Profile"}
                  width={40}
                  height={40}
                  className="rounded-full border border-border/50"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border/50">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{user?.name || "No name set"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Data Export - GDPR Article 20 */}
          <div className="flex items-center justify-between py-2 px-2 rounded bg-muted/30 border border-border/20">
            <div>
              <p className="text-xs font-medium">Export Your Data</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Download a copy of all your personal data in JSON format.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              disabled={isExportingData}
              className="h-7 text-[11px] shrink-0"
            >
              {isExportingData ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </>
              )}
            </Button>
          </div>

          {/* Clear Chat History */}
          <div className="flex items-center justify-between py-2 px-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30">
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Clear Chat History</p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                Delete all chat conversations while keeping your account and connected providers.
              </p>
              {chatHistoryDeleteSuccess && (
                <p className="text-[10px] text-green-600 dark:text-green-500 mt-1">
                  ✓ Chat history deleted successfully
                </p>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeletingChatHistory}
                  className="h-7 text-[11px] shrink-0 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                >
                  {isDeletingChatHistory ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Clear Chat History
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        Are you sure you want to clear all your chat history? This will permanently delete:
                      </p>
                      <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                        <li>All chat conversations and messages</li>
                        <li>AI conversation state (checkpoints)</li>
                      </ul>
                      <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded">
                        <strong>Note:</strong> Your account, connected providers, settings, and all other data will remain unchanged.
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteChatHistory}
                    disabled={isDeletingChatHistory}
                    className="bg-amber-600 text-white hover:bg-amber-700"
                  >
                    {isDeletingChatHistory ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      "Clear Chat History"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between py-2 px-2 rounded bg-destructive/5 border border-destructive/20">
            <div>
              <p className="text-xs font-medium text-destructive">Delete Account</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Permanently delete your account and all personal data.
              </p>
            </div>
            <AlertDialog onOpenChange={(open) => {
              if (!open) {
                setDeleteAccountConfirmEmail("")
                setDeleteAccountError(null)
              }
            }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 text-[11px] shrink-0">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete Account
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        Are you sure you want to delete your account? This action <strong>cannot be undone</strong>. The following data will be permanently deleted:
                      </p>
                      <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                        <li>All chat conversations and messages</li>
                        <li>Connected AdMob and Ad Manager accounts</li>
                        <li>OAuth tokens and credentials</li>
                        <li>Usage analytics and billing metrics</li>
                        <li>Organization memberships</li>
                        <li>Your preferences and settings</li>
                        <li>AI conversation state (checkpoints)</li>
                      </ul>
                      <div className="text-[10px] text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-1.5 rounded">
                        <strong>Tip:</strong> Export your data before deleting using the button above.
                      </div>
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-medium text-foreground">
                          Type your email <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">{user?.email}</span> to confirm:
                        </p>
                        <Input
                          type="email"
                          value={deleteAccountConfirmEmail}
                          onChange={(e) => setDeleteAccountConfirmEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="h-9 text-sm"
                          autoComplete="off"
                        />
                        {deleteAccountError && (
                          <p className="text-[11px] text-destructive">{deleteAccountError}</p>
                        )}
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount || deleteAccountConfirmEmail.toLowerCase() !== user?.email?.toLowerCase()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeletingAccount ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Account"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SectionCardContent>
      </SectionCard>

      {/* Copy Invite Message Modal */}
      <AlertDialog open={showInviteMessageModal} onOpenChange={(open) => {
        setShowInviteMessageModal(open)
        if (!open) {
          setInviteMessageCopied(false)
        }
      }}>
        <AlertDialogContent className="sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-500">
              <Check className="h-5 w-5" />
              Invitation Created
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Copy this message and send it to <strong>{invitedEmail}</strong> via Slack, email, or any messaging app:
                </p>
                <div className="p-3 rounded-lg bg-muted border border-border font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {selectedOrganization && invitedEmail && (
                    <>
                      I invited you to {selectedOrganization.name} on ADAgent!
                      {"\n\n"}
                      Sign in with Google ({invitedEmail}) to accept:
                      {"\n"}
                      {typeof window !== 'undefined' ? window.location.origin : ''}/login
                    </>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              onClick={handleCopyInviteMessage}
              variant={inviteMessageCopied ? "outline" : "default"}
              className="flex-1 sm:flex-none"
            >
              {inviteMessageCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Message
                </>
              )}
            </Button>
            <AlertDialogCancel className="flex-1 sm:flex-none mt-0">Done</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
