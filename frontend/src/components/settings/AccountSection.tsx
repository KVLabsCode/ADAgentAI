"use client"

import * as React from "react"
import Image from "next/image"
import { User, Trash2, AlertTriangle, Download } from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { Button } from "@/atoms/button"
import { Input } from "@/atoms/input"
import { ConfigFieldGroup, ConfigField } from "@/organisms/theme"
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
import { useAccountOperations } from "@/hooks/settings"
import { useUser } from "@/hooks/use-user"

export function AccountSection() {
  const { user, getAccessToken, signOut } = useUser()

  const account = useAccountOperations({
    userEmail: user?.email ?? null,
    getAccessToken,
    signOut,
  })

  return (
    <ConfigFieldGroup>
      {/* Profile with avatar - Linear uses 32x32px avatar */}
      <div className="flex items-center gap-3 px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
        {user?.avatar ? (
          <Image
            src={user.avatar}
            alt={user.name || "Profile"}
            width={32}
            height={32}
            className="rounded-full border border-border/50"
            referrerPolicy="no-referrer"
            unoptimized
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border/50">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="text-[length:var(--text-label)] font-[var(--font-weight-medium)]">{user?.name || "No name set"}</p>
          <p className="text-[length:var(--text-description)] text-[color:var(--text-color-description)]">{user?.email}</p>
        </div>
      </div>
          {/* Data Export - GDPR Article 20 */}
          <ConfigField
            label="Export your data"
            description="Download a copy of all your personal data in JSON format."
          >
            <Button
              variant="outline"
              size="sm"
              onClick={account.exportData}
              disabled={account.isExportingData}
            >
              {account.isExportingData ? (
                <Spinner size="xs" />
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Export
                </>
              )}
            </Button>
          </ConfigField>

          {/* Clear Chat History */}
          <ConfigField
            label="Clear chat history"
            description="Delete all chat conversations while keeping your account."
            highlight="warning"
          >
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={account.isDeletingChatHistory}
                    className="border-warning/30 text-warning hover:bg-warning/10"
                  />
                }
              >
                {account.isDeletingChatHistory ? (
                  <Spinner size="xs" />
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </>
                )}
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Clear Chat History
                  </AlertDialogTitle>
                  <AlertDialogDescription render={<div className="space-y-3" />}>
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
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={account.deleteChatHistory}
                    disabled={account.isDeletingChatHistory}
                    className="bg-warning text-warning-foreground hover:bg-warning/90"
                  >
                    {account.isDeletingChatHistory ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Clearing...
                      </>
                    ) : (
                      "Clear Chat History"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </ConfigField>

          {/* Delete Account */}
          <ConfigField
            label="Delete account"
            description="Permanently delete your account and all personal data."
            highlight="error"
          >
            <AlertDialog onOpenChange={(open) => {
              if (!open) account.resetDeleteAccountDialog()
            }}>
              <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:left-[calc(50%+var(--sidebar-width)/2)] sm:-translate-x-1/2">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete Account
                  </AlertDialogTitle>
                  <AlertDialogDescription render={<div className="space-y-3" />}>
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
                    <div className="text-[10px] text-warning bg-warning/10 px-2 py-1.5 rounded">
                      <strong>Tip:</strong> Export your data before deleting using the button above.
                    </div>
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-medium text-foreground">
                        Type your email <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">{user?.email}</span> to confirm:
                      </p>
                      <Input
                        type="email"
                        value={account.deleteAccountConfirmEmail}
                        onChange={(e) => account.setDeleteAccountConfirmEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="h-9 text-sm"
                        autoComplete="off"
                      />
                      {account.deleteAccountError && (
                        <p className="text-[11px] text-destructive">{account.deleteAccountError}</p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={account.deleteAccount}
                    disabled={account.isDeletingAccount || !account.canConfirmDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {account.isDeletingAccount ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Account"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
      </ConfigField>
    </ConfigFieldGroup>
  )
}
