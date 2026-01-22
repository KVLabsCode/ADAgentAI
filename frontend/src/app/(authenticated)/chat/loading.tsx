import { Skeleton } from "@/atoms/skeleton"

export default function ChatLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Centered prompt area skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Prompt category buttons skeleton */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-22 rounded-md" />
        </div>
      </div>

      {/* Input area skeleton */}
      <div className="p-4">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
