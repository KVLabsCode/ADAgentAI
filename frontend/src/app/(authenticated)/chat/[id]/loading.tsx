import { Skeleton } from "@/atoms/skeleton"

export default function ChatSessionLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Chat messages area skeleton */}
      <div className="flex-1 space-y-4 p-4">
        {/* Assistant message */}
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 max-w-2xl">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>

        {/* User message */}
        <div className="flex gap-3 justify-end">
          <div className="space-y-2 max-w-md">
            <Skeleton className="h-4 w-48 ml-auto" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        </div>

        {/* Another assistant message */}
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 max-w-2xl">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>

      {/* Input area skeleton */}
      <div className="border-t p-4">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}
