"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useUser } from "@/hooks/use-user"

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading } = useUser()
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = React.useState("Completing sign in...")

  React.useEffect(() => {
    // Check for error in URL params
    const error = searchParams.get("error")
    if (error) {
      setStatus("error")
      setMessage(getErrorMessage(error))
      setTimeout(() => {
        router.push(`/login?error=${error}`)
      }, 2000)
      return
    }

    // Wait for auth state to be resolved
    if (isLoading) return

    if (isAuthenticated) {
      setStatus("success")
      setMessage("Sign in successful! Redirecting...")

      // Get redirect destination from localStorage or use default
      const redirectTo = localStorage.getItem("auth_redirect") || "/dashboard"
      localStorage.removeItem("auth_redirect")

      setTimeout(() => {
        router.push(redirectTo)
      }, 500)
    } else {
      // Not authenticated, redirect to sign in
      setStatus("error")
      setMessage("Please sign in to continue.")
      setTimeout(() => {
        router.push("/auth/sign-in")
      }, 1500)
    }
  }, [router, searchParams, isAuthenticated, isLoading])

  return (
    <>
      {status === "loading" && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="h-5 w-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      )}
    </>
  )
}

function CallbackSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-foreground text-background text-sm font-semibold mb-2">
          AD
        </div>

        <Suspense fallback={<CallbackSkeleton />}>
          <CallbackContent />
        </Suspense>
      </div>
    </div>
  )
}

function getErrorMessage(error: string): string {
  switch (error) {
    case "access_denied":
      return "Access was denied. Redirecting to login..."
    case "invalid_request":
      return "Invalid request. Redirecting to login..."
    case "server_error":
      return "Server error occurred. Redirecting to login..."
    default:
      return "Authentication failed. Redirecting to login..."
  }
}
