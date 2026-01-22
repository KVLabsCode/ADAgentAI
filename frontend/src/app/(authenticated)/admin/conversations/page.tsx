"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  MessageSquare,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Users,
  Calendar,
} from "lucide-react"
import { Button } from "@/atoms/button"
import { Badge } from "@/atoms/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SearchInput,
} from "@/molecules"
import {
  PageContainer,
  PageHeader,
  StatCard,
  FilterBar,
  LoadingSpinner,
  EmptyState,
} from "@/organisms/theme"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

// Types
interface Conversation {
  id: string
  userId: string
  organizationId: string | null
  title: string
  isArchived: boolean
  messageCount: number
  status: "success" | "error" | "cancelled"
  service: string | null
  capability: string | null
  langsmithRunId: string | null
  createdAt: string
  updatedAt: string
  lastMessageAt: string | null
}

interface ConversationStats {
  today: number
  week: number
  month: number
  total: number
  errorRate: string
}

interface ConversationsResponse {
  conversations: Conversation[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Status badge - Linear style with design tokens
function StatusBadge({ status }: { status: string }) {
  const styles = {
    success: "bg-badge-success-bg text-success",
    error: "bg-badge-error-bg text-destructive",
    cancelled: "bg-badge-warning-bg text-warning",
  }

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    cancelled: Clock,
  }

  const Icon = icons[status as keyof typeof icons] || CheckCircle
  const style = styles[status as keyof typeof styles] || styles.success

  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10px] font-normal capitalize", style)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function ConversationsPage() {
  const { getAccessToken, selectedOrganizationId } = useUser()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [data, setData] = React.useState<ConversationsResponse | null>(null)
  const [stats, setStats] = React.useState<ConversationStats | null>(null)

  // Filters
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [page, setPage] = React.useState(1)
  const pageSize = 15

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchConversations = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const token = await getAccessToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        status: statusFilter,
      })
      if (debouncedSearch) params.set("search", debouncedSearch)

      const [conversationsRes, statsRes] = await Promise.all([
        authFetch(`${apiUrl}/api/admin/conversations?${params}`, token, {}, selectedOrganizationId),
        authFetch(`${apiUrl}/api/admin/conversations/stats/overview`, token, {}, selectedOrganizationId),
      ])

      if (!conversationsRes.ok) throw new Error("Failed to fetch conversations")

      const conversationsData = await conversationsRes.json()
      setData(conversationsData)

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

    } catch (err) {
      console.error("Failed to fetch conversations:", err)
      toast.error(err instanceof Error ? err.message : "Failed to load conversations")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [getAccessToken, selectedOrganizationId, page, pageSize, statusFilter, debouncedSearch])

  React.useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  return (
    <PageContainer size="xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-[var(--title-to-section)]">
        <div className="space-y-1">
          <h1 className="text-[length:var(--text-page-title)] leading-[var(--line-height-title)] font-medium tracking-tight">Conversation Logs</h1>
          <p className="text-[length:var(--text-description)] text-muted-foreground">View and debug user conversations</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchConversations(true)}
          disabled={isRefreshing}
          className="gap-2 h-8 text-xs"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Content with proper section gaps */}
      <div className="flex flex-col gap-[var(--section-gap)] w-full">
        {/* Stats Row */}
        {stats && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Today" value={stats.today} icon={Calendar} />
            <StatCard title="This Week" value={stats.week} icon={Clock} />
            <StatCard title="This Month" value={stats.month} icon={MessageSquare} />
            <StatCard title="Total" value={stats.total} icon={Users} />
            <StatCard title="Error Rate" value={`${stats.errorRate}%`} icon={AlertCircle} valueColor={parseFloat(stats.errorRate) > 5 ? "error" : "default"} />
          </div>
        )}

        {/* Filters */}
        <FilterBar>
          <SearchInput
            placeholder="Search by user ID or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width="100%"
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="success" className="text-xs">Success</SelectItem>
              <SelectItem value="error" className="text-xs">Error</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        {/* Main Content */}
        {isLoading ? (
          <LoadingSpinner label="Loading conversations..." />
        ) : data && data.conversations.length > 0 ? (
          <div className="w-[calc(100%+var(--page-padding)*2)] -ml-[var(--page-padding)]">
            {/* Column Headers */}
            <div className="flex items-center h-8 text-xs font-medium text-muted-foreground px-[var(--page-padding)]">
              <div className="w-[30%] min-w-0 pl-[var(--item-padding-x)]">Title</div>
              <div className="w-[12%] min-w-0">User</div>
              <div className="w-[8%] min-w-0">Messages</div>
              <div className="w-[15%] min-w-0">Service</div>
              <div className="w-[10%] min-w-0">Status</div>
              <div className="w-[12%] min-w-0">Last Active</div>
              <div className="w-[13%] min-w-0 pr-[var(--item-padding-x)]"></div>
            </div>

            {/* Conversations List */}
            {data.conversations.map((conv, idx) => (
              <React.Fragment key={conv.id}>
                {/* Full-width divider between rows */}
                {idx > 0 && (
                  <div className="h-px w-full bg-[color:var(--item-divider)]" />
                )}
                <div
                  className="group flex items-center h-11 hover:bg-muted/30 has-[[data-state=open]]:bg-muted/30 transition-colors px-[var(--page-padding)]"
                >
                {/* Title */}
                <div className="w-[30%] min-w-0 pl-[var(--item-padding-x)]">
                  <Link
                    href={`/admin/conversations/${conv.id}`}
                    className="text-[13px] font-normal text-foreground hover:text-foreground/80 transition-colors truncate block"
                  >
                    {conv.title || "Untitled Conversation"}
                  </Link>
                </div>

                {/* User */}
                <div className="w-[12%] min-w-0">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {conv.userId.slice(0, 8)}...
                  </span>
                </div>

                {/* Messages */}
                <div className="w-[8%] min-w-0">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-xs">{conv.messageCount}</span>
                  </div>
                </div>

                {/* Service */}
                <div className="w-[15%] min-w-0">
                  {conv.service ? (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-border/50 capitalize">
                      {conv.service}
                      {conv.capability && ` / ${conv.capability}`}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </div>

                {/* Status */}
                <div className="w-[10%] min-w-0">
                  <StatusBadge status={conv.status} />
                </div>

                {/* Last Active */}
                <div className="w-[12%] min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatRelativeTime(conv.lastMessageAt || conv.updatedAt)}
                  </span>
                </div>

                {/* Actions */}
                <div className="w-[13%] min-w-0 flex justify-end pr-[var(--item-padding-x)]">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/admin/conversations/${conv.id}`}>
                        View
                      </Link>
                    </Button>
                    {conv.langsmithRunId && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                        <a
                          href={`https://smith.langchain.com/public/${conv.langsmithRunId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Trace
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              </React.Fragment>
            ))}

            {/* Footer with pagination */}
            <div className="flex items-center justify-between h-10 mt-2 px-[var(--page-padding)]">
              <span className="text-xs text-muted-foreground">
                {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= data.totalPages}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
        <EmptyState
          icon={MessageSquare}
          title="No conversations found"
          description={
            debouncedSearch || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Conversations will appear here once users start chatting"
          }
        />
      )}
      </div>
    </PageContainer>
  )
}
