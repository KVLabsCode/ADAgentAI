"use client"

import * as React from "react"
import Link from "next/link"
import { Search, Download, Trash2, MessageSquare, MoreHorizontal, Loader2, X, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
      const response = await fetch(`${API_URL}/api/chat/sessions`, {
        credentials: 'include',
      })

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
  }, [])

  React.useEffect(() => {
    fetchChats()
  }, [fetchChats])

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

  const handleSelectAll = () => {
    if (selectedIds.size === filteredChats.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredChats.map(c => c.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }

  const handleDelete = async (chatId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/chat/session/${chatId}`, {
        method: 'DELETE',
        credentials: 'include',
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
      // Delete all selected chats
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`${API_URL}/api/chat/session/${id}`, {
          method: 'DELETE',
          credentials: 'include',
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
      const response = await fetch(
        `${API_URL}/api/chat/session/${chatId}/export?format=${format === 'md' ? 'markdown' : 'json'}`,
        { credentials: 'include' }
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

  const isAllSelected = filteredChats.length > 0 && selectedIds.size === filteredChats.length
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredChats.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight">Chat History</h1>
        <p className="text-xs text-muted-foreground/80">
          Browse and manage your conversations.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Select All Row - only show when there are chats */}
      {filteredChats.length > 0 && (
        <div className="flex items-center gap-2 -mt-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            className="h-3.5 w-3.5"
          />
          <span className="text-[11px] text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </span>
        </div>
      )}

      {/* Chat List */}
      {filteredChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">
            {searchQuery ? "No matching conversations" : "No conversations yet"}
          </p>
          <p className="text-xs text-muted-foreground max-w-[240px]">
            {searchQuery
              ? "Try adjusting your search terms."
              : "Start a new chat to see your history here."}
          </p>
          {!searchQuery && (
            <Button asChild size="sm" className="mt-4 h-7 text-xs">
              <Link href="/chat">Start New Chat</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredChats.map((chat) => {
            const isSelected = selectedIds.has(chat.id)

            return (
              <div
                key={chat.id}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isSelected
                    ? "bg-primary/5"
                    : "hover:bg-muted/50"
                )}
              >
                {/* Checkbox - visible on hover or when selected */}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => {}}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(chat.id, e)
                  }}
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                />

                {/* Chat content - clickable link */}
                <Link
                  href={`/chat/${chat.id}`}
                  className="flex-1 min-w-0"
                  onClick={(e) => {
                    // Prevent navigation if shift or ctrl is held
                    if (e.shiftKey || e.ctrlKey || e.metaKey) {
                      e.preventDefault()
                      handleSelect(chat.id, e)
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                      {chat.title}
                    </h3>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelativeDate(chat.date)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {stripMarkdown(chat.preview)}
                  </p>
                </Link>

                {/* Dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
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
            )
          })}
        </div>
      )}

      {/* Floating action bar when items selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-full shadow-xl">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <CheckSquare className="h-4 w-4 text-violet-400" />
              <span className="font-medium">{selectedIds.size}</span>
              <span className="text-zinc-500">selected</span>
            </div>

            <div className="w-px h-4 bg-zinc-700 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="h-7 px-3 text-xs"
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
            <AlertDialogTitle className="text-base">
              Delete {selectedIds.size} conversation{selectedIds.size > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action cannot be undone. All selected conversations will be permanently deleted.
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
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.size} conversation${selectedIds.size > 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
