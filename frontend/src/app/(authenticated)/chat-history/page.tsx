"use client"

import * as React from "react"
import Link from "next/link"
import { Download, Trash2, MessageSquare, MoreHorizontal, X } from "lucide-react"
import { Spinner } from "@/atoms/spinner"
import { Button } from "@/atoms/button"
import { SearchInput } from "@/molecules"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/organisms/theme"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/molecules/dropdown-menu"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ChatHistoryItem {
  id: string
  title: string
  preview: string
  date: string
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function ChatHistoryPage() {
  const { getAccessToken } = useUser()
  const [chats, setChats] = React.useState<ChatHistoryItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Multi-select state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = React.useState<string | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Fetch chat sessions from API
  const fetchChats = React.useCallback(async () => {
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(`${API_URL}/api/chat/sessions`, accessToken)

      if (response.ok) {
        const data = await response.json()
        setChats(data.sessions.map((s: { id: string; title: string; lastMessage?: string; updatedAt: string }) => ({
          id: s.id,
          title: s.title,
          preview: s.lastMessage || 'No messages yet',
          date: s.updatedAt,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getAccessToken])

  React.useEffect(() => {
    fetchChats()
  }, [fetchChats])

  // Escape key to clear selection
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set())
        setLastSelectedId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds.size])

  const filteredChats = chats.filter(
    chat =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.preview.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Selection handlers
  const handleSelect = (chatId: string, event: React.MouseEvent) => {
    const newSelected = new Set(selectedIds)

    if (event.shiftKey && lastSelectedId) {
      // Shift-click: select range
      const chatIds = filteredChats.map(c => c.id)
      const lastIndex = chatIds.indexOf(lastSelectedId)
      const currentIndex = chatIds.indexOf(chatId)

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)

        for (let i = start; i <= end; i++) {
          newSelected.add(chatIds[i])
        }
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd-click: toggle individual
      if (newSelected.has(chatId)) {
        newSelected.delete(chatId)
      } else {
        newSelected.add(chatId)
      }
    } else {
      // Regular click on checkbox: toggle individual
      if (newSelected.has(chatId)) {
        newSelected.delete(chatId)
      } else {
        newSelected.add(chatId)
      }
    }

    setSelectedIds(newSelected)
    setLastSelectedId(chatId)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }

  const handleDelete = async (chatId: string) => {
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(`${API_URL}/api/chat/session/${chatId}`, accessToken, {
        method: 'DELETE',
      })

      if (response.ok) {
        setChats(prev => prev.filter(c => c.id !== chatId))
        selectedIds.delete(chatId)
        setSelectedIds(new Set(selectedIds))
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    try {
      const accessToken = await getAccessToken()
      // Delete all selected chats
      const deletePromises = Array.from(selectedIds).map(id =>
        authFetch(`${API_URL}/api/chat/session/${id}`, accessToken, {
          method: 'DELETE',
        })
      )

      await Promise.all(deletePromises)

      setChats(prev => prev.filter(c => !selectedIds.has(c.id)))
      setSelectedIds(new Set())
      setLastSelectedId(null)
    } catch (error) {
      console.error('Failed to delete chats:', error)
    } finally {
      setIsDeleting(false)
      setShowBulkDeleteDialog(false)
    }
  }

  const handleExport = async (chatId: string, format: "md" | "json") => {
    try {
      const accessToken = await getAccessToken()
      const response = await authFetch(
        `${API_URL}/api/chat/session/${chatId}/export?format=${format === 'md' ? 'markdown' : 'json'}`,
        accessToken
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chat-export.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export chat:', error)
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <Spinner size="md" className="text-muted-foreground" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Chat History"
        description="Browse and manage your conversations."
      />

      {/* Search */}
      <div className="mt-4">
        <SearchInput
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          width="100%"
          className="h-8"
        />
        {filteredChats.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected · Click to deselect, Esc to clear`
              : "⌘+click to select · Shift+click for range"
            }
          </p>
        )}
      </div>

      {/* Chat List */}
      <div className="mt-4">
      {filteredChats.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={searchQuery ? "No matching conversations" : "No conversations yet"}
          description={searchQuery
            ? "Try adjusting your search terms."
            : "Start a new chat to see your history here."}
        >
          {!searchQuery && (
            <Button render={<Link href="/chat" />} size="sm" className="h-8 text-xs">
              Start New Chat
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-0.5">
          {filteredChats.map((chat) => {
            const isSelected = selectedIds.has(chat.id)

            return (
              <div
                key={chat.id}
                className={cn(
                  "group relative flex items-center rounded-md transition-colors cursor-pointer",
                  isSelected
                    ? "bg-accent ring-1 ring-accent-foreground/10"
                    : "hover:bg-muted/50"
                )}
                onClick={(e) => {
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    e.preventDefault()
                    handleSelect(chat.id, e)
                  } else if (selectedIds.size > 0) {
                    // If items are selected, clicking toggles selection
                    handleSelect(chat.id, e)
                  }
                }}
              >
                {/* Selection indicator - left accent bar */}
                <div
                  className={cn(
                    "w-0.5 self-stretch rounded-l-md transition-colors",
                    isSelected ? "bg-primary" : "bg-transparent"
                  )}
                />

                {/* Chat content */}
                <Link
                  href={`/chat/${chat.id}`}
                  className="flex-1 min-w-0 px-3 py-2.5"
                  onClick={(e) => {
                    if (e.shiftKey || e.ctrlKey || e.metaKey || selectedIds.size > 0) {
                      e.preventDefault()
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[13px] font-medium truncate">
                      {chat.title}
                    </h3>
                    <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                      {formatRelativeDate(chat.date)}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
                    {stripMarkdown(chat.preview)}
                  </p>
                </Link>

                {/* Dropdown menu - appears on hover */}
                <div className="pr-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      <span className="sr-only">Chat options</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handleExport(chat.id, "md")} className="text-xs">
                        <Download className="h-3 w-3 mr-2" />
                        Export as MD
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport(chat.id, "json")} className="text-xs">
                        <Download className="h-3 w-3 mr-2" />
                        Export as JSON
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(chat.id)}
                        className="text-xs text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>

      {/* Floating action bar when items selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-1 px-2 py-1.5 bg-background border border-border rounded-lg shadow-lg">
            <span className="text-xs text-muted-foreground px-2">
              {selectedIds.size} selected
            </span>

            <div className="w-px h-4 bg-border" />

            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="h-7 px-2.5 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              Delete {selectedIds.size} conversation{selectedIds.size > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs" disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Spinner size="xs" className="mr-1" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
