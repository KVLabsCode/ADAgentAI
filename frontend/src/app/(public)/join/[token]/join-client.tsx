"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Building2, AlertCircle, CheckCircle, UserPlus } from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { Button } from "@/atoms/button"
import { useUser } from "@/hooks/use-user"
import { authClient } from "@/lib/neon-auth/client"
import { authFetch } from "@/lib/api"

interface InviteLinkInfo {
  valid: boolean
  organization: {
    id: string
    name: string
    slug: string | null
  }
  role: string
}

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; info: InviteLinkInfo }
  | { status: "joining" }
  | { status: "success"; orgName: string }
  | { status: "already_member"; orgName: string }

interface JoinClientProps {
  token: string
}

export function JoinClient({ token }: JoinClientProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: isLoadingUser, getAccessToken, selectOrganization } = useUser()

  const [pageState, setPageState] = useState<PageState>({ status: "loading" })
  const [isSigningIn, setIsSigningIn] = useState(false)

  // Fetch invite link info
  useEffect(() => {
    async function fetchInviteInfo() {
      if (!token) {
        setPageState({ status: "error", message: "Invalid invite link" })
        return
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/invite-links/${token}/info`)

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          setPageState({
            status: "error",
            message: data.error || "This invite link is invalid or has expired"
          })
          return
        }

        const data: InviteLinkInfo = await response.json()
        setPageState({ status: "ready", info: data })
      } catch (error) {
        console.error("Failed to fetch invite info:", error)
        setPageState({ status: "error", message: "Failed to load invite link" })
      }
    }

    fetchInviteInfo()
  }, [token])

  // Handle sign in with Google (redirect back to this page after)
  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `/join/${token}`,
        errorCallbackURL: `/join/${token}?error=auth_failed`,
      })
    } catch (err) {
      console.error("Sign in error:", err)
      setIsSigningIn(false)
    }
  }

  // Handle joining the organization
  const handleJoin = async () => {
    if (pageState.status !== "ready") return

    setPageState({ status: "joining" })

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const accessToken = await getAccessToken()

      const response = await authFetch(`${apiUrl}/api/invite-links/${token}/join`, accessToken, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          // Already a member
          setPageState({ status: "already_member", orgName: data.organization?.name || "the organization" })
          return
        }
        throw new Error(data.error || "Failed to join organization")
      }

      // Success! Set the org as active and redirect
      setPageState({ status: "success", orgName: data.organization.name })

      // Select this org and redirect to dashboard after a brief delay
      await selectOrganization(data.organization.id)
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500)
    } catch (error) {
      console.error("Failed to join:", error)
      setPageState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to join organization"
      })
    }
  }

  // Show loading state
  if (pageState.status === "loading" || isLoadingUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Spinner size="lg" className="mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading invite...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (pageState.status === "error") {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Invalid Invite Link</h1>
            <p className="text-sm text-muted-foreground">{pageState.message}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Show success state
  if (pageState.status === "success") {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Welcome!</h1>
            <p className="text-sm text-muted-foreground">
              You&apos;ve joined <strong>{pageState.orgName}</strong>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  // Show already member state
  if (pageState.status === "already_member") {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Already a Member</h1>
            <p className="text-sm text-muted-foreground">
              You&apos;re already a member of <strong>{pageState.orgName}</strong>
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Show joining state
  if (pageState.status === "joining") {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Spinner size="lg" className="mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Joining organization...</p>
        </div>
      </div>
    )
  }

  // Ready state - show join UI
  const { info } = pageState

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Join {info.organization.name}</h1>
            <p className="text-sm text-muted-foreground">
              You&apos;ve been invited to join as a <span className="font-medium capitalize">{info.role}</span>
            </p>
          </div>
        </div>

        {/* Action */}
        {!isAuthenticated ? (
          <>
            {/* Not signed in - show sign in button */}
            <Button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full h-11 gap-3"
            >
              {isSigningIn ? (
                <Spinner size="sm" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {isSigningIn ? "Signing in..." : "Continue with Google"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Sign in to join this organization
            </p>
          </>
        ) : (
          <>
            {/* Signed in - show join/cancel buttons */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>

              <Button onClick={handleJoin} className="w-full h-11 gap-2">
                <UserPlus className="h-4 w-4" />
                Join Organization
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href="/">Cancel</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
