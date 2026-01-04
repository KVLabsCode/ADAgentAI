"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { authClient } from "@/lib/auth-client"

// Google "G" logo as SVG
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(false)

  const error = searchParams.get("error")
  const errorMessage = React.useMemo(() => {
    switch (error) {
      case "access_denied":
        return "Access was denied. Please try again."
      case "invalid_request":
        return "Invalid request. Please try again."
      case "server_error":
        return "Server error occurred. Please try again later."
      case "temporarily_unavailable":
        return "Service temporarily unavailable. Please try again later."
      default:
        return error ? "Authentication failed. Please try again." : null
    }
  }, [error])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      // Use absolute URLs to ensure redirect goes to frontend, not backend
      const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${frontendUrl}/dashboard`,
        errorCallbackURL: `${frontendUrl}/login?error=auth_failed`,
      })
    } catch (error) {
      console.error('Sign in error:', error)
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-xs">{errorMessage}</p>
        </div>
      )}

      {/* Sign In Button */}
      <div className="space-y-3">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          variant="outline"
          className="w-full h-10 text-sm font-medium relative"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Redirecting...
            </>
          ) : (
            <>
              <GoogleLogo className="h-4 w-4 mr-2" />
              Continue with Google
            </>
          )}
        </Button>

        <p className="text-[10px] text-center text-muted-foreground/70 leading-relaxed">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground transition-colors">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </p>
      </div>
    </>
  )
}

function LoginSkeleton() {
  return (
    <>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-48 mx-auto" />
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-foreground text-background text-sm font-semibold mb-2">
            AD
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-xs text-muted-foreground">
            Sign in to access your ad platform dashboard
          </p>
        </div>

        <Suspense fallback={<LoginSkeleton />}>
          <LoginContent />
        </Suspense>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-[10px] text-muted-foreground/60">
              Early Access
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg border border-border/40 bg-muted/30 px-4 py-3 space-y-2">
          <p className="text-xs font-medium">What you&apos;ll get access to:</p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              Connect AdMob & Google Ad Manager
            </li>
            <li className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              AI-powered insights in plain English
            </li>
            <li className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              Free during early access period
            </li>
          </ul>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
