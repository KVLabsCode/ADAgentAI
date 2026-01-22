"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/atoms/spinner"
import { useUser } from "@/hooks/use-user"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isLoading, isAuthenticated, isAdmin } = useUser()

  // Redirect non-admins to chat
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) {
      router.push("/chat")
    }
  }, [isLoading, isAuthenticated, isAdmin, router])

  // Show loading while checking auth/admin status
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="md" className="text-muted-foreground" />
      </div>
    )
  }

  // Don't render if not admin
  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="md" className="text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      {children}
    </div>
  )
}
