"use client"

import * as React from "react"
import Image from "next/image"
import { User, Trash2, AlertTriangle, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionCard, SectionCardHeader, SectionCardContent } from "@/components/ui/theme"
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
    <SectionCard>
      <SectionCardHeader
        icon={User}
        title="Account"
        description="Manage your account and data."
      />
      <SectionCardContent className="space-y-3">
        {/* Profile with avatar */}
        <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/30 border border-border/20">
          <div className="flex items-center gap-3">
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
            onClick={account.exportData}
            disabled={account.isExportingData}
            className="h-7 text-[11px] shrink-0"
          >
            {account.isExportingData ? (
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
        <div className="flex items-center justify-between py-2 px-2 rounded bg-warning/10 border border-warning/20">
          <div className="flex-1">
            <p className="text-xs font-medium text-warning-foreground">Clear Chat History</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Delete all chat conversations while keeping your account and connected providers.
            </p>
            {account.chatHistoryDeleteSuccess && (
              <p className="text-[10px] text-success mt-1">
                ✓ Chat history deleted successfully
              </p>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={account.isDeletingChatHistory}
                className="h-7 text-[11px] shrink-0 border-warning/30 text-warning-foreground hover:bg-warning/20"
              >
                {account.isDeletingChatHistory ? (
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
                  <AlertTriangle className="h-5 w-5 text-warning" />
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
                  onClick={account.deleteChatHistory}
                  disabled={account.isDeletingChatHistory}
                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  {account.isDeletingChatHistory ? (
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
            if (!open) account.resetDeleteAccountDialog()
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
  )
}
