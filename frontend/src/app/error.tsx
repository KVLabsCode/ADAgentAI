"use client"

import { useEffect } from "react"
import { Button } from "@/atoms/button"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-6 w-6" />
        <h2 className="text-xl font-semibold">Something went wrong</h2>
      </div>
      <p className="text-center text-muted-foreground max-w-md">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  )
}
