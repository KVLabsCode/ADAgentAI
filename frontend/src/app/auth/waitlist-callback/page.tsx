"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

function CallbackHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams.get("success") === "true"
    const email = searchParams.get("email")
    const name = searchParams.get("name")
    const picture = searchParams.get("picture")
    const error = searchParams.get("error")

    const data = success
      ? { success: true, email, name: name || null, picture: picture || null }
      : { success: false, error: error || "Authentication failed" }

    // Store result in sessionStorage for the main page to pick up
    sessionStorage.setItem("waitlist_oauth_result", JSON.stringify(data))

    // Get the return URL or default to home page
    const returnUrl = sessionStorage.getItem("waitlist_return_url") || "/"
    sessionStorage.removeItem("waitlist_return_url")

    // Redirect back to the original page
    window.location.href = returnUrl
  }, [searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Completing authentication...</p>
    </div>
  )
}

export default function WaitlistCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
