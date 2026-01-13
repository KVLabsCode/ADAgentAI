"use client"

import * as React from "react"
import Link from "next/link"
import { MessageSquarePlus, Plug, History, Loader2, ArrowRight } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import {
  PageContainer,
  PageHeader,
  StatCard,
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
  EmptyState,
} from "@/components/ui/theme"

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
    <PageContainer>
      {/* Welcome */}
      <PageHeader
        title={`Welcome back, ${userName}`}
        description="Manage your ad platforms with AI-powered assistance."
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          title="Providers"
          value={connectedProviders}
          icon={Plug}
          subValue={connectedProviders === 0 ? "No providers connected" : "Connected accounts"}
        />
        <StatCard
          title="Chats"
          value={chatCount}
          icon={History}
          subValue="Total conversations"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/chat"
          className="group p-4 rounded border border-border/50 bg-card hover:border-border hover:bg-muted/30 transition-all duration-150"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">New Chat</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Ask about your ad performance or get optimization tips.
          </p>
          <span className="inline-flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Start chatting
            <ArrowRight className="ml-1 h-3 w-3" />
          </span>
        </Link>

        <Link
          href="/providers"
          className="group p-4 rounded border border-border/50 bg-card hover:border-border hover:bg-muted/30 transition-all duration-150"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Plug className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Connect Provider</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Link your AdMob account. Google Ad Manager coming soon.
          </p>
          <span className="inline-flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Add provider
            <ArrowRight className="ml-1 h-3 w-3" />
          </span>
        </Link>
      </div>

      {/* Recent Activity */}
      <SectionCard>
        <SectionCardHeader
          icon={History}
          title="Recent Activity"
        >
          {recentChats.length > 0 && (
            <Link
              href="/chat-history"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
            </Link>
          )}
        </SectionCardHeader>
        <SectionCardContent padded={false}>
          {recentChats.length === 0 ? (
            <EmptyState
              icon={History}
              title="No recent conversations"
              description="Start a new chat to see your activity here."
              className="py-8"
            />
          ) : (
            <div className="divide-y divide-border/30">
              {recentChats.slice(0, 5).map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs truncate min-w-0">{chat.title}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatRelativeDate(chat.updatedAt || chat.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCardContent>
      </SectionCard>
    </PageContainer>
  )
}
