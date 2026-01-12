"use client"

import * as React from "react"
import Link from "next/link"
import {
  MessageSquare,
  Search,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DataTableContainer,
  DataTableHeaderRow,
  DataTableHead,
  DataTableRow,
  DataTableCell,
  Table,
  TableBody,
  TableHeader,
} from "@/components/ui/data-table"
import {
  PageContainer,
  PageHeader,
  StatCard,
  FilterBar,
  LoadingSpinner,
  EmptyState,
  ErrorCard,
} from "@/components/ui/theme"
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

// Status badge
function StatusBadge({ status }: { status: string }) {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    error: "bg-rose-500/10 text-rose-500 border-rose-500/30",
    cancelled: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  }

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    cancelled: Clock,
  }

  const Icon = icons[status as keyof typeof icons] || CheckCircle
  const style = styles[status as keyof typeof styles] || styles.success

  return (
    <Badge variant="outline" className={cn("gap-1 font-mono text-[10px] capitalize", style)}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
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
  const [error, setError] = React.useState<string | null>(null)

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

      setError(null)
    } catch (err) {
      console.error("Failed to fetch conversations:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
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
      <PageHeader
        title="Conversation Logs"
        description="View and debug user conversations"
      >
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
      </PageHeader>

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
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by user ID or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
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
      ) : error ? (
        <ErrorCard
          title="Failed to load conversations"
          message={error}
          onRetry={() => fetchConversations()}
        />
      ) : data && data.conversations.length > 0 ? (
        <DataTableContainer>
          <Table>
            <TableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Title</DataTableHead>
                <DataTableHead>User</DataTableHead>
                <DataTableHead>Messages</DataTableHead>
                <DataTableHead>Service</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead>Last Active</DataTableHead>
                <DataTableHead className="text-right">Actions</DataTableHead>
              </DataTableHeaderRow>
            </TableHeader>
            <TableBody>
              {data.conversations.map((conv) => (
                <DataTableRow key={conv.id} className="group">
                  <DataTableCell>
                    <Link
                      href={`/admin/conversations/${conv.id}`}
                      className="font-medium text-foreground hover:text-foreground/80 transition-colors line-clamp-1 max-w-[200px]"
                    >
                      {conv.title || "Untitled Conversation"}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {conv.userId.slice(0, 8)}...
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-sm">{conv.messageCount}</span>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    {conv.service ? (
                      <Badge variant="outline" className="font-mono text-xs capitalize">
                        {conv.service}
                        {conv.capability && ` / ${conv.capability}`}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={conv.status} />
                  </DataTableCell>
                  <DataTableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatRelativeTime(conv.lastMessageAt || conv.updatedAt)}
                    </span>
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/conversations/${conv.id}`}>
                          View
                        </Link>
                      </Button>
                      {conv.langsmithRunId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          asChild
                        >
                          <a
                            href={`https://smith.langchain.com/public/${conv.langsmithRunId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Trace
                          </a>
                        </Button>
                      )}
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, data.total)} of {data.total}
            </p>
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
        </DataTableContainer>
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
    </PageContainer>
  )
}
