import { Suspense } from "react"
import { Spinner } from "@/atoms/spinner"
import { PublicLayoutClient } from "./layout-client"

function PublicLayoutFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" className="text-muted-foreground" />
    </div>
  )
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Static year - updated annually, avoids Date() issues with cacheComponents
  const currentYear = 2025

  return (
    <Suspense fallback={<PublicLayoutFallback />}>
      <PublicLayoutClient currentYear={currentYear}>{children}</PublicLayoutClient>
    </Suspense>
  )
}
