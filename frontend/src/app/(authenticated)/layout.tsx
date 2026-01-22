import { Suspense } from "react"
import { Spinner } from "@/atoms/spinner"
import { AuthenticatedLayoutClient } from "./layout-client"

// Loading fallback for Suspense boundary
function AuthLayoutFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" className="text-muted-foreground" />
    </div>
  )
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<AuthLayoutFallback />}>
      <AuthenticatedLayoutClient>{children}</AuthenticatedLayoutClient>
    </Suspense>
  )
}
