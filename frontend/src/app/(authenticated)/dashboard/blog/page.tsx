"use client"

import * as React from "react"
import Link from "next/link"
import {
  MoreHorizontal,
  Plus,
  FileText,
  Eye,
  Pencil,
  Trash2,
  Star,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/atoms/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SearchInput,
} from "@/molecules"
import { Badge } from "@/atoms/badge"
import { PageContainer, EmptyState } from "@/organisms/theme"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/molecules/alert-dialog"
import { Skeleton } from "@/atoms/skeleton"
import { useBlogPosts } from "@/hooks/use-blog-posts"
import type { BlogPostMeta } from "@/lib/types"

function formatDate(dateString: string | undefined) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  // Linear style: subtle background with colored text - using design tokens
  const styles = status === "published"
    ? "bg-badge-published-bg text-success"
    : "bg-badge-draft-bg text-foreground"

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-xs font-normal ${styles}`}>
      {status === "published" ? "Published" : "Draft"}
    </span>
  )
}

export default function BlogAdminPage() {
  const { posts, isLoading, deletePost } = useBlogPosts()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [postToDelete, setPostToDelete] = React.useState<BlogPostMeta | null>(null)

  const handleDeleteClick = (post: BlogPostMeta) => {
    setPostToDelete(post)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (postToDelete) {
      await deletePost(postToDelete.id)
      setDeleteDialogOpen(false)
      setPostToDelete(null)
    }
  }

  // Filter posts by search query
  const filteredPosts = React.useMemo(() => {
    if (!searchQuery) return posts
    const query = searchQuery.toLowerCase()
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        post.slug.toLowerCase().includes(query)
    )
  }, [posts, searchQuery])

  // Group posts by status
  const groupedPosts = React.useMemo(() => {
    const groups: Record<string, BlogPostMeta[]> = {
      published: [],
      draft: [],
    }
    for (const post of filteredPosts) {
      if (groups[post.status]) {
        groups[post.status].push(post)
      }
    }
    return groups
  }, [filteredPosts])

  return (
    <PageContainer size="full">
      {/* Header - Linear style: title on first row, controls below */}
      <div className="flex flex-col gap-3 -mx-[var(--page-padding)] px-[var(--page-padding)]">
        <h1 className="text-[length:var(--text-page-title)] leading-[var(--line-height-title)] font-[var(--font-weight-medium)] pl-[var(--item-padding-x)]">
          Blog
        </h1>
        <div className="flex items-center gap-5 pl-[var(--item-padding-x)] pr-[var(--item-padding-x)] pb-2">
          {/* Search - Linear style using SearchInput molecule */}
          <SearchInput
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            width={300}
          />
          {/* New Post button - pushed right */}
          <Button asChild size="sm" className="h-8 ml-auto">
            <Link href="/dashboard/blog/new">
              <Plus className="h-3.5 w-3.5" />
              New Post
            </Link>
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="mt-4 overflow-visible">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No blog posts yet"
            description="Create your first post to get started."
          >
            <Button asChild size="sm" className="h-8 text-xs">
              <Link href="/dashboard/blog/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Post
              </Link>
            </Button>
          </EmptyState>
        ) : (
          <div className="flex flex-col overflow-visible">
            {/* Column Headers */}
            <div className="flex items-center h-8 text-xs font-medium text-muted-foreground -mx-[var(--page-padding)] px-[var(--page-padding)]">
              <div className="w-[40%] min-w-0 pl-[var(--item-padding-x)]">Title</div>
              <div className="w-[8%] min-w-0">Status</div>
              <div className="w-[8%] min-w-0">Featured</div>
              <div className="w-[12%] min-w-0">Category</div>
              <div className="w-[12%] min-w-0">Author</div>
              <div className="w-[12%] min-w-0">Updated</div>
              <div className="w-[8%] min-w-0 pr-[var(--item-padding-x)]"></div>
            </div>

            {/* Grouped Posts */}
            {(["published", "draft"] as const).map((status) => {
              const statusPosts = groupedPosts[status]
              if (statusPosts.length === 0) return null

              return (
                <div key={status}>
                  {/* Section Header - full width with negative margins */}
                  <div className="flex items-center gap-2 h-8 bg-list-section-bg -mx-[var(--page-padding)] px-[var(--page-padding)]">
                    <span className="text-xs font-medium text-foreground capitalize pl-[var(--item-padding-x)]">
                      {status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {statusPosts.length}
                    </span>
                  </div>

                  {/* Posts */}
                  {statusPosts.map((post, idx) => (
                    <div
                      key={post.id}
                      className={cn(
                        "group flex items-center h-11 hover:bg-muted/30 has-[[data-state=open]]:bg-muted/30 transition-colors -mx-[var(--page-padding)] px-[var(--page-padding)]",
                        idx < statusPosts.length - 1 && "border-b border-[color:var(--item-divider)]"
                      )}
                    >
                      {/* Title */}
                      <div className="w-[40%] min-w-0 flex flex-col gap-0 pl-[var(--item-padding-x)]">
                        <span className="text-[13px] font-normal text-foreground truncate">
                          {post.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {post.slug}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="w-[8%] min-w-0">
                        <StatusBadge status={post.status} />
                      </div>

                      {/* Featured */}
                      <div className="w-[8%] min-w-0">
                        {post.featured ? (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Category */}
                      <div className="w-[12%] min-w-0">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-border/50">
                          {post.category}
                        </Badge>
                      </div>

                      {/* Author */}
                      <div className="w-[12%] min-w-0">
                        <span className="text-xs text-muted-foreground truncate">
                          {post.authorName}
                        </span>
                      </div>

                      {/* Updated */}
                      <div className="w-[12%] min-w-0">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(post.updatedAt)}
                        </span>
                      </div>

                      {/* Actions - only visible on hover */}
                      <div className="w-[8%] min-w-0 flex justify-end pr-[var(--item-padding-x)]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 data-[state=open]:bg-muted hover:bg-muted transition-all">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem asChild className="text-xs cursor-pointer">
                              <Link href={`/blog/${post.slug}`} target="_blank">
                                <Eye className="mr-2 h-3.5 w-3.5" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="text-xs cursor-pointer">
                              <Link href={`/dashboard/blog/${post.id}/edit`}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => handleDeleteClick(post)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}

            {/* No results after filtering */}
            {filteredPosts.length === 0 && searchQuery && (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                No posts found matching &quot;{searchQuery}&quot;
              </div>
            )}

            {/* Footer count */}
            <div className="flex items-center h-8 mt-2 pl-[var(--item-padding-x)]">
              <span className="text-xs text-muted-foreground">
                {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete post?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete &quot;{postToDelete?.title}&quot;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
