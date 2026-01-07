"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Bell, Shield, User, MessageSquare, Building2, UserPlus, Trash2, Crown, ShieldCheck, Users, Mail, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useChatSettings } from "@/lib/chat-settings"
import { useUser } from "@/hooks/use-user"
import { authClient } from "@/lib/neon-auth/client"
import { OrganizationMember } from "@/lib/types"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { displayMode, setDisplayMode } = useChatSettings()
  const { selectedOrganization, selectedOrganizationId, user } = useUser()
  const [mounted, setMounted] = React.useState(false)

  // Organization management state
  const [members, setMembers] = React.useState<OrganizationMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<"member" | "admin">("member")
  const [isInviting, setIsInviting] = React.useState(false)
  const [inviteError, setInviteError] = React.useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = React.useState(false)

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
    console.log("[Settings] selectedOrganizationId changed:", selectedOrganizationId)
    if (selectedOrganizationId) {
      fetchMembers()
    } else {
      setMembers([])
    }
  }, [selectedOrganizationId, fetchMembers])

  const handleInvite = async () => {
    if (!inviteEmail || !selectedOrganizationId) return
    setIsInviting(true)
    setInviteError(null)
    setInviteSuccess(false)
    try {
      // Active org is already set by fetchMembers, just call invite
      await authClient.organization.inviteMember({
        email: inviteEmail,
        role: inviteRole,
      })
      setInviteEmail("")
      setInviteSuccess(true)
      setTimeout(() => setInviteSuccess(false), 3000)
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Failed to send invite")
    } finally {
      setIsInviting(false)
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

  const currentUserRole = members.find(m => m.userId === user?.id)?.role
  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin"

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="h-3 w-3 text-amber-500" />
      case "admin": return <ShieldCheck className="h-3 w-3 text-blue-500" />
      default: return <Users className="h-3 w-3 text-muted-foreground" />
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground/80">
          Manage your application preferences.
        </p>
      </div>

      {/* Chat Display */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Chat Display</h2>
            <p className="text-[10px] text-muted-foreground/60">Configure how agent activity is displayed.</p>
          </div>
        </div>
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Compact mode</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Show thinking and tool calls in a single combined box.
              </p>
            </div>
            <Switch
              checked={displayMode === "compact"}
              onCheckedChange={(checked) => setDisplayMode(checked ? "compact" : "detailed")}
            />
          </div>
        </div>
      </div>

      {/* Organization */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Organization</h2>
            <p className="text-[10px] text-muted-foreground/60">
              {selectedOrganization ? `Manage ${selectedOrganization.name}` : "Select an organization to manage"}
            </p>
          </div>
        </div>
        <div className="px-3 py-3 space-y-4">
          {!selectedOrganization ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Switch to an organization using the sidebar to manage members.
            </p>
          ) : (
            <>
              {/* Invite Members */}
              {canManageMembers && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <p className="text-xs font-medium">Invite Member</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "member" | "admin")}>
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member" className="text-xs">Member</SelectItem>
                        <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleInvite}
                      disabled={isInviting || !inviteEmail}
                      className="h-8 text-xs px-3"
                    >
                      {isInviting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
                      Invite
                    </Button>
                  </div>
                  {inviteError && (
                    <p className="text-[10px] text-destructive">{inviteError}</p>
                  )}
                  {inviteSuccess && (
                    <p className="text-[10px] text-green-600">Invitation sent successfully!</p>
                  )}
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
                          <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 rounded bg-muted">
                            {member.role}
                          </span>
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
            </>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <Sun className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Appearance</h2>
            <p className="text-[10px] text-muted-foreground/60">Customize how ADAgentAI looks.</p>
          </div>
        </div>
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Theme</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Select your preferred color scheme.
              </p>
            </div>
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
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Notifications</h2>
            <p className="text-[10px] text-muted-foreground/60">Configure how you receive updates.</p>
          </div>
        </div>
        <div className="px-3 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Email notifications</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Receive email updates about your ad performance.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="border-t border-border/20 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Weekly digest</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Get a weekly summary of your ad metrics.
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Privacy</h2>
            <p className="text-[10px] text-muted-foreground/60">Manage your data and privacy settings.</p>
          </div>
        </div>
        <div className="px-3 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Usage analytics</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Help improve ADAgentAI by sharing anonymous usage data.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="border-t border-border/20 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Chat history</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Store conversation history for future reference.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground/70" />
          <div>
            <h2 className="text-xs font-medium">Account</h2>
            <p className="text-[10px] text-muted-foreground/60">Manage your account settings.</p>
          </div>
        </div>
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-destructive">Delete Account</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                This will permanently delete your account and all associated data.
              </p>
            </div>
            <Button variant="destructive" size="sm" className="h-7 text-[11px]">
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
