"use client"

import * as React from "react"
import Image from "next/image"
import {
  Building2, UserPlus, Trash2, Crown, ShieldCheck, Users,
  Send, Mail, X, Clock, Pencil, AlertTriangle,
  Link2, Copy, Check, RefreshCw, Shield, User
} from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { Button } from "@/atoms/button"
import { Input } from "@/atoms/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/molecules/select"
import { GmailEmailInput, getFullEmail } from "@/organisms/gmail-email-input"
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
} from "@/molecules/alert-dialog"
import {
  useMemberManagement,
  useInvitationManagement,
  useInviteLinkManagement,
  useOrganizationManagement,
} from "@/hooks/settings"
import { useUser } from "@/hooks/use-user"

function getRoleIcon(role: string) {
  switch (role.toLowerCase()) {
    case "owner": return <Crown className="h-3 w-3 text-amber-500" />
    case "admin": return <ShieldCheck className="h-3 w-3 text-blue-500" />
    default: return <Users className="h-3 w-3 text-muted-foreground" />
  }
}

export function OrganizationSection() {
  const { selectedOrganization, selectedOrganizationId, user, getAccessToken } = useUser()

  // Hooks
  const members = useMemberManagement({
    organizationId: selectedOrganizationId,
    userId: user?.id,
  })

  const invitations = useInvitationManagement({
    organizationId: selectedOrganizationId,
    organizationName: selectedOrganization?.name,
    onInviteSent: members.fetchMembers,
  })

  const inviteLink = useInviteLinkManagement({
    organizationId: selectedOrganizationId,
    canManageMembers: members.canManageMembers,
    getAccessToken,
  })

  const org = useOrganizationManagement({
    organizationId: selectedOrganizationId,
    organizationName: selectedOrganization?.name ?? null,
  })

  const handleInvite = () => {
    const email = getFullEmail(invitations.inviteUsername, invitations.inviteDomain)
    if (email) {
      invitations.sendInvite(email)
    }
  }

  return (
    <>
      <div className="px-4 py-4 space-y-4">
        {!selectedOrganization ? (
          <p className="text-[13px] text-muted-foreground text-center py-4">
            Switch to an organization using the sidebar to manage members.
          </p>
        ) : (
            <>
              {/* Share Member Link */}
              {members.canManageMembers && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <p className="text-xs font-medium">Share Member Link</p>
                    {inviteLink.isLoadingInviteLink && <Spinner size="xs" className="text-muted-foreground" />}
                  </div>

                  {inviteLink.inviteLink ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/30 text-xs font-mono overflow-hidden">
                          <span className="truncate text-muted-foreground">{inviteLink.inviteLink.url}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={inviteLink.copyInviteLink}
                          className="h-9 w-9 p-0 shrink-0"
                        >
                          {inviteLink.linkCopied ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">
                          Anyone with this link can join as Member
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>Used {inviteLink.inviteLink.usageCount} time{inviteLink.inviteLink.usageCount !== 1 ? 's' : ''}</span>
                          <span>·</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={inviteLink.createOrRegenerateLink}
                            disabled={inviteLink.isRegeneratingLink}
                            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            {inviteLink.isRegeneratingLink ? (
                              <Spinner size="xs" />
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
                        onClick={inviteLink.createOrRegenerateLink}
                        disabled={inviteLink.isRegeneratingLink}
                        className="h-8 text-xs"
                      >
                        {inviteLink.isRegeneratingLink ? (
                          <Spinner size="xs" className="mr-1" />
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
              {members.canManageMembers && (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] text-muted-foreground">or invite as Admin</span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
              )}

              {/* Invite Members via Email (Admin role) */}
              {members.canManageMembers && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <p className="text-xs font-medium">Invite as Admin</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <GmailEmailInput
                      value={invitations.inviteUsername}
                      onChange={invitations.setInviteUsername}
                      domain={invitations.inviteDomain}
                      onDomainChange={invitations.setInviteDomain}
                      disabled={invitations.isInviting}
                      placeholder="username"
                      className="flex-1"
                      showDomainSelector={false}
                    />
                    <Select value={invitations.inviteRole} onValueChange={(v) => invitations.setInviteRole(v as "member" | "admin")}>
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
                    <Button
                      size="sm"
                      onClick={handleInvite}
                      disabled={invitations.isInviting || !invitations.inviteUsername}
                      className="h-9 w-9 p-0 shrink-0"
                    >
                      {invitations.isInviting ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    They can accept after signing in with Google.
                  </p>
                  {invitations.inviteError && (
                    <p className="text-[10px] text-destructive">{invitations.inviteError}</p>
                  )}
                  {invitations.inviteSuccess && (
                    <p className="text-[10px] text-success">Invitation created! They&apos;ll see it after signing in.</p>
                  )}
                </div>
              )}

              {/* Pending Invitations */}
              {members.canManageMembers && invitations.pendingInvites.length > 0 && (
                <div className="border-t border-border/20 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <p className="text-xs font-medium">Pending Invitations</p>
                    </div>
                    {invitations.isLoadingInvites && <Spinner size="xs" className="text-muted-foreground" />}
                  </div>
                  <div className="space-y-1">
                    {invitations.pendingInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded bg-warning/10 border border-warning/20"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-warning" />
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
                            onClick={() => invitations.resendInvite(invite)}
                            disabled={invitations.resendingInviteId === invite.id}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {invitations.resendingInviteId === invite.id ? (
                              <Spinner size="xs" />
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
                            onClick={() => invitations.cancelInvite(invite.id)}
                            disabled={invitations.cancellingInviteId === invite.id}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {invitations.cancellingInviteId === invite.id ? (
                              <Spinner size="xs" />
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
                  {members.isLoading && <Spinner size="xs" className="text-muted-foreground" />}
                </div>
                <div className="space-y-1.5">
                  {members.members.length === 0 && !members.isLoading ? (
                    <p className="text-[10px] text-muted-foreground py-2">No members found.</p>
                  ) : (
                    members.members.map((member) => {
                      const isEditing = members.editingMemberId === member.id
                      const canEdit = members.canManageMembers && member.role !== "owner" && member.userId !== user?.id

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
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
                              <>
                                <Select
                                  value={members.pendingRole || member.role}
                                  onValueChange={(v) => members.setPendingRole(v as "member" | "admin")}
                                  disabled={members.changingRoleMemberId === member.id}
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
                                  onClick={() => members.saveRole(member.id)}
                                  disabled={members.changingRoleMemberId === member.id || members.pendingRole === member.role}
                                  className="h-7 px-2 text-xs"
                                >
                                  {members.changingRoleMemberId === member.id ? (
                                    <Spinner size="xs" />
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={members.cancelEditRole}
                                  className="h-7 px-2 text-xs text-muted-foreground"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-muted-foreground capitalize px-2 py-1 rounded-md bg-muted border border-border/30">
                                  {member.role}
                                </span>
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => members.startEditRole(member.id, member.role)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => members.removeMember(member.id)}
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
              {members.currentUserRole === "owner" && (
                <div className="border-t border-border/20 pt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <p className="text-xs font-medium">Organization Settings</p>
                  </div>

                  {/* Rename Organization */}
                  <div className="flex items-center justify-between py-2 px-2 rounded bg-muted/30">
                    <div className="flex-1">
                      <p className="text-xs font-medium">Organization Name</p>
                      {org.isEditingOrgName ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <Input
                            type="text"
                            name="organization"
                            autoComplete="organization"
                            value={org.newOrgName}
                            onChange={(e) => org.setNewOrgName(e.target.value)}
                            className="h-7 text-xs flex-1"
                            placeholder="Organization name"
                          />
                          <Button
                            size="sm"
                            onClick={org.updateOrgName}
                            disabled={org.isUpdatingOrg || !org.newOrgName.trim()}
                            className="h-7 text-xs px-2"
                          >
                            {org.isUpdatingOrg ? <Spinner size="xs" /> : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={org.cancelEditingOrgName}
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
                    {!org.isEditingOrgName && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={org.startEditingOrgName}
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
                    <AlertDialog onOpenChange={(open) => !open && org.resetDeleteConfirm()}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-3.5 w-3.5" />
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
                                Are you sure you want to delete <strong>{selectedOrganization?.name}</strong>? This action cannot be undone.
                              </p>
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-foreground">
                                  Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{selectedOrganization?.name}</span> to confirm:
                                </p>
                                <Input
                                  type="text"
                                  value={org.deleteConfirmText}
                                  onChange={(e) => org.setDeleteConfirmText(e.target.value)}
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
                            onClick={org.deleteOrganization}
                            disabled={org.isDeletingOrg || !org.canConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {org.isDeletingOrg ? (
                              <>
                                <Spinner size="sm" className="mr-2" />
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

                  {org.orgError && (
                    <p className="text-[10px] text-destructive">{org.orgError}</p>
                  )}
                </div>
              )}
          </>
        )}
      </div>

      {/* Copy Invite Message Modal */}
      <AlertDialog open={invitations.showInviteMessageModal} onOpenChange={(open) => {
        if (!open) invitations.closeInviteMessageModal()
      }}>
        <AlertDialogContent className="sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              Invitation Created
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Copy this message and send it to <strong>{invitations.invitedEmail}</strong> via Slack, email, or any messaging app:
                </p>
                <div className="p-3 rounded-lg bg-muted border border-border font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {selectedOrganization && invitations.invitedEmail && (
                    <>
                      I invited you to {selectedOrganization.name} on ADAgent!
                      {"\n\n"}
                      Sign in with Google ({invitations.invitedEmail}) to accept:
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
              onClick={invitations.copyInviteMessage}
              variant={invitations.inviteMessageCopied ? "outline" : "default"}
              className="flex-1 sm:flex-none"
            >
              {invitations.inviteMessageCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-success" />
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
    </>
  )
}
