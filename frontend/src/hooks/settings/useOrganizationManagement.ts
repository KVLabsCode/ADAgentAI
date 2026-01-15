"use client"

import * as React from "react"
import { authClient } from "@/lib/neon-auth/client"

interface UseOrganizationManagementOptions {
  organizationId: string | null
  organizationName: string | null
}

export function useOrganizationManagement({
  organizationId,
  organizationName,
}: UseOrganizationManagementOptions) {
  // Organization editing state
  const [isEditingOrgName, setIsEditingOrgName] = React.useState(false)
  const [newOrgName, setNewOrgName] = React.useState("")
  const [isUpdatingOrg, setIsUpdatingOrg] = React.useState(false)
  const [orgError, setOrgError] = React.useState<string | null>(null)

  // Organization deletion state
  const [isDeletingOrg, setIsDeletingOrg] = React.useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("")

  // Initialize org name for editing
  React.useEffect(() => {
    if (organizationName) {
      setNewOrgName(organizationName)
    }
  }, [organizationName])

  const startEditingOrgName = () => {
    setIsEditingOrgName(true)
    setNewOrgName(organizationName || "")
  }

  const cancelEditingOrgName = () => {
    setIsEditingOrgName(false)
    setNewOrgName(organizationName || "")
    setOrgError(null)
  }

  const updateOrgName = async () => {
    if (!organizationId || !newOrgName.trim()) return
    setIsUpdatingOrg(true)
    setOrgError(null)
    try {
      await authClient.organization.update({
        data: {
          name: newOrgName.trim(),
          slug: newOrgName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        },
        organizationId,
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

  const deleteOrganization = async () => {
    if (!organizationId) return
    setIsDeletingOrg(true)
    setOrgError(null)
    try {
      await authClient.organization.delete({ organizationId })
      // Redirect to dashboard after deletion
      window.location.href = "/dashboard"
    } catch (error) {
      setOrgError(error instanceof Error ? error.message : "Failed to delete organization")
      setIsDeletingOrg(false)
    }
  }

  const resetDeleteConfirm = () => {
    setDeleteConfirmText("")
  }

  const canConfirmDelete = deleteConfirmText === organizationName

  return {
    // Org name editing
    isEditingOrgName,
    newOrgName,
    setNewOrgName,
    isUpdatingOrg,
    startEditingOrgName,
    cancelEditingOrgName,
    updateOrgName,
    // Org deletion
    isDeletingOrg,
    deleteConfirmText,
    setDeleteConfirmText,
    resetDeleteConfirm,
    canConfirmDelete,
    deleteOrganization,
    // Errors
    orgError,
  }
}
