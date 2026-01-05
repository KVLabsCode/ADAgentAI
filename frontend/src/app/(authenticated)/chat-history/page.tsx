"use client"

import * as React from "react"
import Link from "next/link"
import { Search, Download, Trash2, MessageSquare, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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

  const handleDelete = async (chatId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/chat/session/${chatId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setChats(prev => prev.filter(c => c.id !== chatId))
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl mx-auto">
      <div className="space-y-0.5">
        <h1 className="text-lg font-semibold tracking-tight">Chat History</h1>
        <p className="text-sm text-muted-foreground">
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
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Link href={`/chat/${chat.id}`} className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                    {chat.title}
                  </h3>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatRelativeDate(chat.date)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {chat.preview}
                </p>
              </Link>

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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-xs text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-base">Delete conversation?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(chat.id)}
                          className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
