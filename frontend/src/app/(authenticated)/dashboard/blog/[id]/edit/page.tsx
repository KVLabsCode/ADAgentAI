import { Suspense } from "react"
import { Skeleton } from "@/atoms/skeleton"
import { EditPostClient } from "./edit-post-client"

function EditPostSkeleton() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}

// Server Component - awaits params before passing to client
export default async function EditPostPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<EditPostSkeleton />}>
      <EditPostClient postId={id} />
    </Suspense>
  )
}
