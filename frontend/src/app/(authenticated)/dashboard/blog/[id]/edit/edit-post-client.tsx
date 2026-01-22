"use client"

import { PostEditorForm } from "@/components/blog/post-editor-form"
import { useBlogPost } from "@/hooks/use-blog-posts"
import { Skeleton } from "@/atoms/skeleton"

interface EditPostClientProps {
  postId: string
}

export function EditPostClient({ postId }: EditPostClientProps) {
  const { post, isLoading, error } = useBlogPost(postId)

  if (isLoading) {
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

  if (error || !post) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            {error || "Post not found"}
          </p>
        </div>
      </div>
    )
  }

  return <PostEditorForm post={post} isEdit />
}
