"use client"

import * as React from "react"
import { authFetch } from "@/lib/api"

interface UseAccountOperationsOptions {
  userEmail: string | null
  getAccessToken: () => Promise<string | null>
  signOut: () => void | Promise<void>
}

export function useAccountOperations({
  userEmail,
  getAccessToken,
  signOut,
}: UseAccountOperationsOptions) {
  // Data export state
  const [isExportingData, setIsExportingData] = React.useState(false)

  // Chat history deletion state
  const [isDeletingChatHistory, setIsDeletingChatHistory] = React.useState(false)
  const [chatHistoryDeleteSuccess, setChatHistoryDeleteSuccess] = React.useState(false)

  // Delete account state
  const [deleteAccountConfirmEmail, setDeleteAccountConfirmEmail] = React.useState("")
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false)
  const [deleteAccountError, setDeleteAccountError] = React.useState<string | null>(null)

  // Data export handler (GDPR Article 20: Right to Data Portability)
  const exportData = async () => {
    setIsExportingData(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
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
  const deleteChatHistory = async () => {
    setIsDeletingChatHistory(true)
    setChatHistoryDeleteSuccess(false)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const accessToken = await getAccessToken()
      const response = await authFetch(`${apiUrl}/api/account/chat-history`, accessToken, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete chat history')
      }

      setChatHistoryDeleteSuccess(true)
      setTimeout(() => setChatHistoryDeleteSuccess(false), 3000)
    } catch (error) {
      console.error("Failed to delete chat history:", error)
    } finally {
      setIsDeletingChatHistory(false)
    }
  }

  // Delete account handler
  const deleteAccount = async () => {
    if (!userEmail) return
    if (deleteAccountConfirmEmail.toLowerCase() !== userEmail.toLowerCase()) {
      setDeleteAccountError("Email doesn't match your account email")
      return
    }

    setIsDeletingAccount(true)
    setDeleteAccountError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const accessToken = await getAccessToken()
      const response = await authFetch(`${apiUrl}/api/account`, accessToken, {
        method: 'DELETE',
        body: JSON.stringify({ confirmEmail: deleteAccountConfirmEmail }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete account')
      }

      await signOut()
    } catch (error) {
      console.error("Failed to delete account:", error)
      setDeleteAccountError(error instanceof Error ? error.message : "Failed to delete account")
      setIsDeletingAccount(false)
    }
  }

  const resetDeleteAccountDialog = () => {
    setDeleteAccountConfirmEmail("")
    setDeleteAccountError(null)
  }

  const canConfirmDeleteAccount = userEmail
    ? deleteAccountConfirmEmail.toLowerCase() === userEmail.toLowerCase()
    : false

  return {
    // Data export
    isExportingData,
    exportData,
    // Chat history
    isDeletingChatHistory,
    chatHistoryDeleteSuccess,
    deleteChatHistory,
    // Account deletion
    deleteAccountConfirmEmail,
    setDeleteAccountConfirmEmail,
    isDeletingAccount,
    deleteAccountError,
    deleteAccount,
    resetDeleteAccountDialog,
    canConfirmDeleteAccount,
  }
}
