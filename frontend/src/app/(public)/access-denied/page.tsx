"use client"

import Link from "next/link"
import { Clock, Scroll, ArrowLeft, XCircle } from "lucide-react"
import { Button } from "@/atoms/button"
import { useUser } from "@/hooks/use-user"
import { AuthenticatedWaitlistDialog } from "@/components/authenticated-waitlist-dialog"

export default function AccessDeniedPage() {
  const { waitlistAccessReason, signOut, user, recheckWaitlistAccess } = useUser()

  const getContent = () => {
    switch (waitlistAccessReason) {
      case "not_on_waitlist":
        return {
          icon: <Scroll className="h-12 w-12 text-muted-foreground" />,
          title: "Waitlist",
          description: "Please join our waitlist to be able to access our product.",
          action: (
            <div className="flex flex-col gap-2">
              {user?.email ? (
                <AuthenticatedWaitlistDialog
                  email={user.email}
                  onSuccess={recheckWaitlistAccess}
                />
              ) : (
                <Button render={<Link href="/" />}>Join Waitlist</Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ),
        }
      case "pending_approval":
        return {
          icon: <Clock className="h-12 w-12 text-amber-500" />,
          title: "You're on the waitlist",
          description: "Thank you for your interest in our product. We will get in touch with you as soon as possible.",
          action: (
            <div className="flex flex-col gap-2">
              <Button variant="outline" render={<Link href="/" />}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ),
        }
      case "rejected":
        return {
          icon: <XCircle className="h-12 w-12 text-destructive" />,
          title: "Access not available",
          description: "Unfortunately, your access request was not approved. If you think this is a mistake, please contact support.",
          action: (
            <div className="flex flex-col gap-2">
              <Button variant="outline" render={<Link href="/" />}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ),
        }
      default:
        return {
          icon: <XCircle className="h-12 w-12 text-muted-foreground" />,
          title: "Access denied",
          description: "You don't have access to ADAgentAI. Please join the waitlist to get started.",
          action: (
            <div className="flex flex-col gap-2">
              {user?.email ? (
                <AuthenticatedWaitlistDialog
                  email={user.email}
                  onSuccess={recheckWaitlistAccess}
                />
              ) : (
                <Button render={<Link href="/" />}>Join Waitlist</Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ),
        }
    }
  }

  const content = getContent()

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">{content.icon}</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{content.title}</h1>
          <p className="text-muted-foreground text-sm">{content.description}</p>
          {user?.email && (
            <p className="text-xs text-muted-foreground/70">
              Signed in as {user.email}
            </p>
          )}
        </div>
        <div className="pt-4">{content.action}</div>
      </div>
    </div>
  )
}
