"use client"

import * as React from "react"
import { Building2, Check, X, Clock } from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { Button } from "@/atoms/button"
import { ReceivedInvitation } from "@/lib/types"

interface InvitationCardProps {
  invitation: ReceivedInvitation
  onAccept: () => Promise<void>
  onReject: () => Promise<void>
  variant?: "compact" | "full"
}

// Helper to format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

// Helper to format expiry
function formatExpiry(dateStr: string): { text: string; isExpired: boolean; isUrgent: boolean } {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) {
    return { text: "Expired", isExpired: true, isUrgent: false }
  }
  if (diffDays === 0) {
    return { text: "Expires today", isExpired: false, isUrgent: true }
  }
  if (diffDays === 1) {
    return { text: "Expires tomorrow", isExpired: false, isUrgent: true }
  }
  if (diffDays < 7) {
    return { text: `Expires in ${diffDays} days`, isExpired: false, isUrgent: true }
  }
  return { text: `Expires in ${diffDays} days`, isExpired: false, isUrgent: false }
}

export function InvitationCard({
  invitation,
  onAccept,
  onReject,
  variant = "full",
}: InvitationCardProps) {
  const [isAccepting, setIsAccepting] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)

  const expiry = formatExpiry(invitation.expiresAt)
  const isProcessing = isAccepting || isRejecting

  const handleAccept = async () => {
    setIsAccepting(true)
    try {
      await onAccept()
    } finally {
      setIsAccepting(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await onReject()
    } finally {
      setIsRejecting(false)
    }
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {invitation.organizationName}
            </p>
            <p className="text-xs text-muted-foreground">
              as <span className="capitalize">{invitation.role}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={isProcessing || expiry.isExpired}
            className="h-7 px-2 text-xs"
          >
            {isAccepting ? (
              <Spinner size="xs" />
            ) : (
              <>
                <Check className="h-3 w-3 mr-1" />
                Accept
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReject}
            disabled={isProcessing}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            {isRejecting ? (
              <Spinner size="xs" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Full variant for settings page
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {invitation.organizationName}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
              {invitation.role}
            </span>
            <span>·</span>
            <span>Invited {formatRelativeTime(invitation.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Clock className={`h-3 w-3 ${expiry.isExpired ? 'text-destructive' : expiry.isUrgent ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <span className={`text-[10px] ${expiry.isExpired ? 'text-destructive' : expiry.isUrgent ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {expiry.text}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={isProcessing || expiry.isExpired}
          className="h-8"
        >
          {isAccepting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Accept
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={isProcessing}
          className="h-8 text-muted-foreground hover:text-destructive hover:border-destructive"
        >
          {isRejecting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <X className="h-4 w-4 mr-1" />
              Decline
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
