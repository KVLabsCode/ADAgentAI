"use client"

import * as React from "react"
import Link from "next/link"
import { MessageSquarePlus, Plug, ArrowRight, History, Loader2 } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface ApiSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface ApiProvider {
  id: string
  type: "admob" | "gam"
  name: string
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

export default function DashboardPage() {
  const { user, getAccessToken, isLoading: isUserLoading } = useUser()
  const [providers, setProviders] = React.useState<ApiProvider[]>([])
  const [recentChats, setRecentChats] = React.useState<ApiSession[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      try {
        const accessToken = await getAccessToken()
        const [providersRes, sessionsRes] = await Promise.all([
          authFetch(`${API_URL}/api/providers`, accessToken),
          authFetch(`${API_URL}/api/chat/sessions`, accessToken),
        ])

        if (providersRes.ok) {
          const data = await providersRes.json()
          setProviders(data.providers || [])
        }

        if (sessionsRes.ok) {
          const data = await sessionsRes.json()
          setRecentChats(data.sessions || [])
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (!isUserLoading) {
      fetchData()
    }
  }, [getAccessToken, isUserLoading])

  const userName = user?.name || user?.email?.split('@')[0] || 'User'
  const connectedProviders = providers.length
  const chatCount = recentChats.length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="text-xs text-muted-foreground/80">
          Manage your ad platforms with AI-powered assistance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-border/30 px-3 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide">Providers</span>
            <Plug className="h-3 w-3 text-muted-foreground/50" />
          </div>
          <div className="text-xl font-medium tabular-nums">{connectedProviders}</div>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {connectedProviders === 0 ? "No providers connected" : "Connected accounts"}
          </p>
        </div>

        <div className="rounded border border-border/30 px-3 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide">Chats</span>
            <History className="h-3 w-3 text-muted-foreground/50" />
          </div>
          <div className="text-xl font-medium tabular-nums">{chatCount}</div>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Total conversations</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href="/chat"
          className="group rounded border border-border/30 px-3 py-2.5 hover:border-border/50 hover:bg-muted/20 transition-all duration-150"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquarePlus className="h-3.5 w-3.5 text-foreground/70" />
            <span className="text-sm font-medium">New Chat</span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mb-2">
            Ask about your ad performance or get optimization tips.
          </p>
          <span className="inline-flex items-center text-[11px] font-medium text-foreground/60 group-hover:text-foreground/80 transition-colors">
            Start chatting
            <ArrowRight className="ml-0.5 h-2.5 w-2.5" />
          </span>
        </Link>

        <Link
          href="/providers"
          className="group rounded border border-border/30 px-3 py-2.5 hover:border-border/50 hover:bg-muted/20 transition-all duration-150"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Plug className="h-3.5 w-3.5 text-foreground/70" />
            <span className="text-sm font-medium">Connect Provider</span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mb-2">
            Link your AdMob account. Google Ad Manager coming soon.
          </p>
          <span className="inline-flex items-center text-[11px] font-medium text-foreground/60 group-hover:text-foreground/80 transition-colors">
            Add provider
            <ArrowRight className="ml-0.5 h-2.5 w-2.5" />
          </span>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="rounded border border-border/30">
        <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
          <h2 className="text-xs font-medium">Recent Activity</h2>
          {recentChats.length > 0 && (
            <Link
              href="/chat-history"
              className="text-[10px] text-muted-foreground/60 hover:text-foreground/80 transition-colors"
            >
              View all
            </Link>
          )}
        </div>
        <div className="px-3 py-2">
          {recentChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <History className="h-5 w-5 text-muted-foreground/30 mb-1.5" />
              <p className="text-[11px] text-muted-foreground/60">No recent conversations</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentChats.slice(0, 5).map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className="group flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">{chat.title}</p>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">
                        {formatRelativeDate(chat.updatedAt || chat.createdAt)}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 ml-2 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
