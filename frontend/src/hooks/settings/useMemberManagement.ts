"use client"

import * as React from "react"
import { authClient } from "@/lib/neon-auth/client"
import { OrganizationMember } from "@/lib/types"

interface UseMemberManagementOptions {
  organizationId: string | null
  userId?: string
}

export function useMemberManagement({ organizationId, userId }: UseMemberManagementOptions) {
  const [members, setMembers] = React.useState<OrganizationMember[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [changingRoleMemberId, setChangingRoleMemberId] = React.useState<string | null>(null)
  const [editingMemberId, setEditingMemberId] = React.useState<string | null>(null)
  const [pendingRole, setPendingRole] = React.useState<"member" | "admin" | null>(null)

  const fetchMembers = React.useCallback(async () => {
    if (!organizationId) return
    setIsLoading(true)
    try {
      await authClient.organization.setActive({ organizationId })
      const response = await authClient.organization.listMembers({
        query: { limit: 100 },
      })
      if (response.data) {
        const memberList = Array.isArray(response.data)
          ? response.data
          : (response.data as { members?: Array<{
              id: string
              userId: string
              organizationId: string
              role: string
              createdAt: Date
              user?: { id: string; name: string | null; email: string; image: string | null }
            }> }).members || []

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
      setIsLoading(false)
    }
  }, [organizationId])

  React.useEffect(() => {
    if (organizationId) {
      fetchMembers()
    } else {
      setMembers([])
    }
  }, [organizationId, fetchMembers])

  const removeMember = async (memberId: string) => {
    if (!organizationId) return
    if (!confirm("Are you sure you want to remove this member?")) return
    try {
      await authClient.organization.removeMember({ memberIdOrEmail: memberId })
      fetchMembers()
    } catch (error) {
      console.error("Failed to remove member:", error)
    }
  }

  const startEditRole = (memberId: string, currentRole: string) => {
    setEditingMemberId(memberId)
    setPendingRole(currentRole as "member" | "admin")
  }

  const cancelEditRole = () => {
    setEditingMemberId(null)
    setPendingRole(null)
  }

  const saveRole = async (memberId: string) => {
    if (!organizationId || !pendingRole) return
    setChangingRoleMemberId(memberId)
    try {
      await authClient.organization.updateMemberRole({
        memberId,
        role: pendingRole,
        organizationId,
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

  // Compute current user's role
  const currentUserRole = React.useMemo(() => {
    const memberRole = members.find(m => m.userId === userId)?.role?.toLowerCase()
    return memberRole || null
  }, [members, userId])

  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin"

  return {
    members,
    isLoading,
    fetchMembers,
    removeMember,
    // Role editing
    editingMemberId,
    pendingRole,
    setPendingRole,
    changingRoleMemberId,
    startEditRole,
    cancelEditRole,
    saveRole,
    // Permissions
    currentUserRole,
    canManageMembers,
  }
}
