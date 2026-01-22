import { Suspense } from "react"
import { Spinner } from "@/atoms/spinner"
import { ChatSessionClient } from "./chat-session-client"

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center">
      <Spinner size="md" className="text-muted-foreground" />
    </div>
  )
}

// Async inner component that handles the dynamic params
async function ChatSessionContent({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id: sessionId } = await params
  return <ChatSessionClient sessionId={sessionId} />
}

// Non-async page that wraps the async content in Suspense
export default function ChatSessionPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ChatSessionContent params={params} />
    </Suspense>
  )
}
