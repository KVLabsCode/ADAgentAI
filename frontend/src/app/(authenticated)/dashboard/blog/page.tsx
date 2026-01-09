"use client"

import * as React from "react"
import Link from "next/link"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"
import {
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  Search,
  FileText,
  Eye,
  Pencil,
  Trash2,
  Star,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
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
  return (
    <Badge
      variant={status === "published" ? "default" : "secondary"}
      className={`text-[10px] ${
        status === "published"
          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
          : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20"
      }`}
    >
      {status === "published" ? "Published" : "Draft"}
    </Badge>
  )
}

export default function BlogAdminPage() {
  const { posts, isLoading, deletePost } = useBlogPosts()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
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

  const columns: ColumnDef<BlogPostMeta>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 text-xs font-medium -ml-3"
        >
          Title
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-xs line-clamp-1">
            {row.getValue("title")}
          </span>
          <span className="text-[10px] text-muted-foreground line-clamp-1">
            {row.original.slug}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "featured",
      header: "Featured",
      cell: ({ row }) => (
        row.getValue("featured") ? (
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-border/50">
          {row.getValue("category")}
        </Badge>
      ),
    },
    {
      accessorKey: "authorName",
      header: "Author",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.getValue("authorName")}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 text-xs font-medium -ml-3"
        >
          Updated
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.getValue("updatedAt"))}
        </span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const post = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0">
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
        )
      },
    },
  ]

  const table = useReactTable({
    data: posts,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Blog Admin</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your blog posts
          </p>
        </div>
        <Button asChild size="sm" className="h-8 text-xs">
          <Link href="/dashboard/blog/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Post
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search posts..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium mb-1">No blog posts yet</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Create your first post to get started.
          </p>
          <Button asChild size="sm" className="h-8 text-xs">
            <Link href="/dashboard/blog/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Post
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-border/50">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-10 text-xs">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-xs text-muted-foreground"
                    >
                      No posts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {table.getFilteredRowModel().rows.length} post(s)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

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
    </div>
  )
}
