"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useUser } from "@/hooks/use-user"

export default function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAdmin, isLoading } = useUser()

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/dashboard")
    }
  }, [isAdmin, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}
