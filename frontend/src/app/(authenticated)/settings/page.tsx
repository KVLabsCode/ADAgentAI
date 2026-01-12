"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Bell, Shield, User, MessageSquare, Building2, UserPlus, Trash2, Crown, ShieldCheck, Users, Loader2, Send, Mail, X, RotateCw, Pencil, AlertTriangle } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GmailEmailInput, GMAIL_DOMAINS, getFullEmail } from "@/components/ui/gmail-email-input"
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
import { OrganizationMember } from "@/lib/types"
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
  const [inviteDomain, setInviteDomain] = React.useState<string>(GMAIL_DOMAINS[0].id)
  const [inviteRole, setInviteRole] = React.useState<"member" | "admin">("member")
  const [isInviting, setIsInviting] = React.useState(false)
  const [inviteError, setInviteError] = React.useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = React.useState(false)

  // Pending invitations state
  const [pendingInvites, setPendingInvites] = React.useState<PendingInvitation[]>([])
  const [isLoadingInvites, setIsLoadingInvites] = React.useState(false)
  const [cancellingInviteId, setCancellingInviteId] = React.useState<string | null>(null)
  const [resendingInviteId, setResendingInviteId] = React.useState<string | null>(null)

  // Organization settings state
  const [isEditingOrgName, setIsEditingOrgName] = React.useState(false)
  const [newOrgName, setNewOrgName] = React.useState("")
  const [isUpdatingOrg, setIsUpdatingOrg] = React.useState(false)
  const [isDeletingOrg, setIsDeletingOrg] = React.useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("")
  const [orgError, setOrgError] = React.useState<string | null>(null)

  // Role change state
  const [changingRoleMemberId, setChangingRoleMemberId] = React.useState<string | null>(null)

  // Delete account state
  const [deleteAccountConfirmEmail, setDeleteAccountConfirmEmail] = React.useState("")
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false)
  const [deleteAccountError, setDeleteAccountError] = React.useState<string | null>(null)

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

  // Initialize org name for editing
  React.useEffect(() => {
    if (selectedOrganization) {
      setNewOrgName(selectedOrganization.name)
    }
  }, [selectedOrganization])

  const handleInvite = async () => {
    if (!inviteUsername || !selectedOrganizationId) return
    const email = getFullEmail(inviteUsername, inviteDomain)
    setIsInviting(true)
    setInviteError(null)
    setInviteSuccess(false)
    try {
      // Active org is already set by fetchMembers, just call invite
      await authClient.organization.inviteMember({
        email,
        role: inviteRole,
      })
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

  // Change member role (org admin only feature)
  const handleChangeRole = async (memberId: string, newRole: "member" | "admin") => {
    if (!selectedOrganizationId) return
    setChangingRoleMemberId(memberId)
    try {
      await authClient.organization.updateMemberRole({
        memberId,
        role: newRole, // Better Auth/Neon Auth accepts string role
        organizationId: selectedOrganizationId,
      })
      fetchMembers()
    } catch (error) {
      console.error("Failed to change member role:", error)
    } finally {
      setChangingRoleMemberId(null)
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
              {/* Invite Members */}
              {canManageMembers && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <p className="text-xs font-medium">Invite Member</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Email input with Google icon and domain dropdown */}
                    <GmailEmailInput
                      value={inviteUsername}
                      onChange={setInviteUsername}
                      domain={inviteDomain}
                      onDomainChange={setInviteDomain}
                      disabled={isInviting}
                      className="flex-1"
                    />
                    {/* Role selector */}
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "member" | "admin")}>
                      <SelectTrigger className="h-9 w-24 text-xs shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member" className="text-xs">Member</SelectItem>
                        <SelectItem value="admin" className="text-xs">Admin</SelectItem>
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
                    They&apos;ll receive an email invite and can join by signing in with Google.
                  </p>
                  {inviteError && (
                    <p className="text-[10px] text-destructive">{inviteError}</p>
                  )}
                  {inviteSuccess && (
                    <p className="text-[10px] text-green-600">Invite sent! They&apos;ll receive an email shortly.</p>
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
                                <RotateCw className="h-3 w-3 mr-1" />
                                Resend
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
                <div className="space-y-1">
                  {members.length === 0 && !isLoadingMembers ? (
                    <p className="text-[10px] text-muted-foreground py-2">No members found.</p>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          <div>
                            <p className="text-xs font-medium">{member.user?.name || member.user?.email || "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground">{member.user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Role badge - editable for non-owners by admins */}
                          {canManageMembers && member.role !== "owner" && member.userId !== user?.id ? (
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => handleChangeRole(member.id, newRole as "member" | "admin")}
                              disabled={changingRoleMemberId === member.id}
                            >
                              <SelectTrigger className="h-6 w-20 text-[10px] px-1.5 py-0">
                                {changingRoleMemberId === member.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member" className="text-[10px]">Member</SelectItem>
                                <SelectItem value="admin" className="text-[10px]">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 rounded bg-muted">
                              {member.role}
                            </span>
                          )}
                          {canManageMembers && member.role !== "owner" && member.userId !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
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
          description="Manage your account settings."
        />
        <SectionCardContent>
          <div className="flex items-center justify-between py-2 px-2 rounded bg-destructive/5 border border-destructive/20">
            <div>
              <p className="text-xs font-medium text-destructive">Delete Account</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Permanently delete your account and all associated data including chat history, connected providers, and settings.
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
                        <li>All chat conversations and history</li>
                        <li>Connected AdMob and Ad Manager accounts</li>
                        <li>Your preferences and settings</li>
                      </ul>
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
    </PageContainer>
  )
}
