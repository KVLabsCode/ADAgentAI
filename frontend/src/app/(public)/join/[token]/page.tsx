import { Suspense } from "react"
import { Spinner } from "@/atoms/spinner"
import { JoinClient } from "./join-client"

interface JoinPageProps {
  params: Promise<{ token: string }>
}

function JoinFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Spinner size="lg" className="mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading invite...</p>
      </div>
    </div>
  )
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params

  return (
    <Suspense fallback={<JoinFallback />}>
      <JoinClient token={token} />
    </Suspense>
  )
}
