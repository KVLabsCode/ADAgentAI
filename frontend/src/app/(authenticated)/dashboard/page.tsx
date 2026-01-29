"use client"

import * as React from "react"
import Link from "next/link"
import { MessageSquarePlus, Plug, History, ArrowRight } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import {
  PageContainer,
  PageHeader,
  SettingsSection,
  ConfigFieldGroup,
  EmptyState,
} from "@/organisms/theme"
import { StatCard } from "@/molecules/stat-card"
import { Skeleton } from "@/atoms/skeleton"

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
  const { user, isLoading: isUserLoading } = useUser()

  // React Query handles caching, refetching, deduplication
  const { data, isLoading: isDataLoading } = useDashboardData()

  const providers = data?.providers ?? []
  const networks = data?.networks ?? []
  const recentChats = data?.sessions ?? []

  const userName = user?.name || user?.email?.split('@')[0] || 'User'
  // Combined count of OAuth providers + API-key networks
  const connectedProviders = providers.length + networks.length
  const chatCount = recentChats.length

  // Show skeleton only on initial load, not during background refetch
  const showSkeleton = isUserLoading || (isDataLoading && !data)

  return (
    <PageContainer>
      {/* Welcome */}
      <PageHeader
        title={`Welcome back, ${userName}`}
        description="Manage your ad platforms with AI-powered assistance."
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-2">
        {showSkeleton ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/40 bg-card/50">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div>
                <Skeleton className="h-5 w-8 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/40 bg-card/50">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div>
                <Skeleton className="h-5 w-8 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </>
        ) : (
          <>
            <StatCard
              title="Providers"
              value={connectedProviders}
              subValue={connectedProviders === 0 ? "No providers" : "Providers"}
              icon={Plug}
              href="/providers"
            />
            <StatCard
              title="Conversations"
              value={chatCount}
              subValue="Conversations"
              icon={History}
              href="/chat-history"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <SettingsSection title="Quick Actions" bare>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/chat"
            className="group px-[var(--item-padding-x)] py-[var(--item-padding-y)] rounded-[var(--card-radius)] border border-border/40 bg-[var(--card-bg)] hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
              <span className="text-[length:var(--text-label)] font-medium">New Chat</span>
            </div>
            <p className="text-[length:var(--text-description)] text-muted-foreground mb-3">
              Ask about your ad performance or get optimization tips.
            </p>
            <span className="inline-flex items-center text-[length:var(--text-description)] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Start chatting
              <ArrowRight className="ml-1 h-3 w-3" />
            </span>
          </Link>

          <Link
            href="/providers"
            className="group px-[var(--item-padding-x)] py-[var(--item-padding-y)] rounded-[var(--card-radius)] border border-border/40 bg-[var(--card-bg)] hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Plug className="h-4 w-4 text-muted-foreground" />
              <span className="text-[length:var(--text-label)] font-medium">Connect Provider</span>
            </div>
            <p className="text-[length:var(--text-description)] text-muted-foreground mb-3">
              Link your AdMob account. Google Ad Manager coming soon.
            </p>
            <span className="inline-flex items-center text-[length:var(--text-description)] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Add provider
              <ArrowRight className="ml-1 h-3 w-3" />
            </span>
          </Link>
        </div>
      </SettingsSection>

      {/* Recent Activity */}
      <SettingsSection title="Recent Activity">
        {showSkeleton ? (
          <ConfigFieldGroup>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </ConfigFieldGroup>
        ) : recentChats.length === 0 ? (
          <EmptyState
            icon={History}
            title="No recent conversations"
            description="Start a new chat to see your activity here."
            className="py-8"
          />
        ) : (
          <ConfigFieldGroup>
            {recentChats.slice(0, 5).map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="flex items-center justify-between gap-4 px-[var(--item-padding-x)] py-[var(--item-padding-y)] hover:bg-muted/30 transition-colors"
              >
                <span className="text-[length:var(--text-label)] truncate min-w-0">{chat.title}</span>
                <span className="text-[length:var(--text-small)] text-muted-foreground whitespace-nowrap shrink-0">
                  {formatRelativeDate(chat.updatedAt || chat.createdAt)}
                </span>
              </Link>
            ))}
            {recentChats.length > 5 && (
              <Link
                href="/chat-history"
                className="flex items-center justify-center px-[var(--item-padding-x)] py-[var(--item-padding-y)] text-[length:var(--text-description)] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                View all conversations
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            )}
          </ConfigFieldGroup>
        )}
      </SettingsSection>
    </PageContainer>
  )
}
