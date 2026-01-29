"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Users,
  Clock,
  UserPlus,
  Plug,
  ExternalLink,
  BarChart3,
  Bug,
  CreditCard,
  Database,
  FileText,
  Globe,
  KeyRound,
  LineChart,
  MessageSquare,
  Server,
  Zap,
  RefreshCw,
} from "lucide-react"
import {
  PageContainer,
  PageHeader,
  SettingsSection,
} from "@/organisms/theme"
import { Button } from "@/atoms/button"
import { Skeleton } from "@/atoms/skeleton"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import { authFetch } from "@/lib/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

const externalTools = [
  {
    name: "LangSmith",
    description: "LLM observability & tracing",
    url: "https://smith.langchain.com",
    icon: LineChart,
  },
  {
    name: "Sentry",
    description: "Error tracking & monitoring",
    url: "https://sentry.io",
    icon: Bug,
  },
  {
    name: "Neon",
    description: "PostgreSQL database",
    url: "https://console.neon.tech",
    icon: Database,
  },
  {
    name: "Vercel",
    description: "Deployments & hosting",
    url: "https://vercel.com/dashboard",
    icon: Globe,
  },
  {
    name: "Sanity",
    description: "Content management",
    url: "https://sanity.io/manage",
    icon: FileText,
  },
  {
    name: "Render",
    description: "Backend services",
    url: "https://dashboard.render.com",
    icon: Server,
  },
  {
    name: "Google Cloud",
    description: "OAuth & API credentials",
    url: "https://console.cloud.google.com/apis/credentials",
    icon: KeyRound,
  },
  {
    name: "PostHog",
    description: "Product analytics",
    url: "https://app.posthog.com",
    icon: BarChart3,
  },
]

interface AdminStats {
  users: {
    total: number
    activeThisWeek: number
    weeklyChange: string
  }
  waitlist: {
    pending: number
  }
  providers: {
    total: number
  }
  conversations: {
    today: number
  }
  tokens: {
    monthTotal: number
    monthCost: number
    formatted: string
    costFormatted: string
  }
  modelUsage: Array<{
    model: string
    runCount: number
    totalTokens: number
    totalCost: number
    percentage: number
  }>
  dailyActivity: Array<{
    date: string
    activeUsers: number
    conversations: number
  }>
}

// Simple sparkline component
function Sparkline({ data, color = "primary" }: { data: number[], color?: "primary" | "success" | "warning" }) {
  if (data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 80
  const height = 24
  const padding = 2

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(" ")

  const colorClass = {
    primary: "stroke-primary",
    success: "stroke-success",
    warning: "stroke-warning",
  }[color]

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        className={cn(colorClass, "opacity-70")}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Stat card with optional sparkline
interface StatCardProps {
  title: string
  value: string | number
  subValue?: string
  icon: React.ElementType
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  href?: string
  sparklineData?: number[]
  loading?: boolean
}

function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  change,
  changeType = "neutral",
  href,
  sparklineData,
  loading,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border border-border/40 bg-card/50",
        "transition-colors duration-150",
        href && "hover:bg-card hover:border-border/60 cursor-pointer"
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        {loading ? (
          <>
            <Skeleton className="h-3 w-20 mb-1" />
            <Skeleton className="h-5 w-12 mb-0.5" />
            <Skeleton className="h-3 w-16" />
          </>
        ) : (
          <>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-semibold tabular-nums leading-none">{value}</p>
              {change && (
                <span
                  className={cn(
                    "text-[10px] flex items-center gap-0.5",
                    changeType === "positive" && "text-success",
                    changeType === "negative" && "text-destructive",
                    changeType === "neutral" && "text-muted-foreground"
                  )}
                >
                  {change}
                </span>
              )}
            </div>
            {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
          </>
        )}
      </div>
      {sparklineData && sparklineData.length > 1 && !loading && (
        <div className="shrink-0">
          <Sparkline data={sparklineData} />
        </div>
      )}
    </div>
  )

  if (href) {
    return <a href={href}>{content}</a>
  }

  return content
}

// Clean up model name for display
function cleanModelName(model: string): string {
  return model
    .replace("openrouter/", "")
    .replace("anthropic/", "")
    .replace("google/", "")
    .split("/").pop()
    ?.replace(/-\d{8}$/, "") // Remove date suffix like -20250514
    ?.replace(/-preview.*$/, "") // Remove preview suffixes
    || model
}

// Consolidate model usage by cleaned display name
function consolidateModelUsage(models: AdminStats["modelUsage"]): AdminStats["modelUsage"] {
  const consolidated = new Map<string, { runCount: number; totalTokens: number; totalCost: number }>()

  for (const m of models) {
    // Skip unknown/null models
    if (!m.model || m.model === "unknown" || m.model === "null") continue

    const displayName = cleanModelName(m.model)
    const existing = consolidated.get(displayName) || { runCount: 0, totalTokens: 0, totalCost: 0 }
    consolidated.set(displayName, {
      runCount: existing.runCount + m.runCount,
      totalTokens: existing.totalTokens + m.totalTokens,
      totalCost: existing.totalCost + m.totalCost,
    })
  }

  // Calculate percentages based on consolidated totals
  const totalTokens = Array.from(consolidated.values()).reduce((sum, m) => sum + m.totalTokens, 0)

  return Array.from(consolidated.entries()).map(([model, data]) => ({
    model,
    runCount: data.runCount,
    totalTokens: data.totalTokens,
    totalCost: data.totalCost,
    percentage: totalTokens > 0 ? Math.round((data.totalTokens / totalTokens) * 100) : 0,
  }))
}

// Model usage bar
function ModelUsageBar({ model, percentage, cost }: { model: string; percentage: number; tokens?: number; cost: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-32 truncate text-sm text-muted-foreground" title={model}>
        {model}
      </div>
      <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/70 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="w-12 text-xs text-muted-foreground text-right tabular-nums">
        {percentage}%
      </div>
      <div className="w-16 text-xs text-muted-foreground text-right tabular-nums">
        ${cost.toFixed(2)}
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { getAccessToken, isLoading: isAuthLoading, isAuthenticated } = useUser()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return

    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("No access token available")
      }
      const res = await authFetch(`${API_URL}/api/admin/stats`, token)
      if (!res.ok) {
        throw new Error(`Failed to fetch stats: ${res.status}`)
      }
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error("Failed to fetch admin stats:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch stats")
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, isAuthenticated])

  useEffect(() => {
    // Wait for auth to be fully ready before fetching
    if (!isAuthLoading && isAuthenticated) {
      // Small delay to ensure token is available
      const timer = setTimeout(() => {
        fetchStats()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [fetchStats, isAuthLoading, isAuthenticated])

  // Extract sparkline data from daily activity
  const conversationSparkline = stats?.dailyActivity.map(d => d.conversations) || []
  const userSparkline = stats?.dailyActivity.map(d => d.activeUsers) || []

  return (
    <PageContainer size="lg">
      <div className="flex items-center justify-between mb-[var(--title-to-section)]">
        <PageHeader
          title="Admin Panel"
          description="Overview and external service links."
          className="mb-0"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {!loading && stats && stats.users.total === 0 && stats.conversations.today === 0 && (
        <div className="rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground mb-4">
          No usage data found. Stats will populate as users interact with the app.
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard
          title="Users"
          value={stats?.users.total ?? "-"}
          subValue="All time"
          icon={Users}
          loading={loading}
          sparklineData={userSparkline}
        />
        <StatCard
          title="Active (7d)"
          value={stats?.users.activeThisWeek ?? "-"}
          subValue="This week"
          change={stats?.users.activeThisWeek === 0 ? undefined : stats?.users.weeklyChange}
          changeType={stats?.users.weeklyChange?.startsWith("+") ? "positive" : stats?.users.weeklyChange?.startsWith("-") ? "negative" : "neutral"}
          icon={Clock}
          loading={loading}
        />
        <StatCard
          title="Chats Today"
          value={stats?.conversations.today ?? "-"}
          subValue="Today"
          icon={MessageSquare}
          loading={loading}
          sparklineData={conversationSparkline}
        />
        <StatCard
          title="Waitlist"
          value={stats?.waitlist.pending ?? "-"}
          subValue="Pending"
          icon={UserPlus}
          href="/admin/waitlist"
          loading={loading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-[var(--section-gap)]">
        <StatCard
          title="Queries (30d)"
          value={stats?.modelUsage ? stats.modelUsage.reduce((sum, m) => sum + m.runCount, 0) : "-"}
          subValue="User messages"
          icon={MessageSquare}
          loading={loading}
        />
        <StatCard
          title="Tokens (30d)"
          value={stats?.tokens.formatted ?? "-"}
          subValue="Input + output"
          icon={Zap}
          loading={loading}
        />
        <StatCard
          title="Cost (30d)"
          value={stats?.tokens.costFormatted ?? "-"}
          subValue="Estimated spend"
          icon={CreditCard}
          loading={loading}
        />
        <StatCard
          title="Providers"
          value={stats?.providers.total ?? "-"}
          subValue="Connected"
          icon={Plug}
          loading={loading}
        />
      </div>

      {/* Model Usage */}
      {stats?.modelUsage && stats.modelUsage.length > 0 && (() => {
        const consolidated = consolidateModelUsage(stats.modelUsage)
        return (
          <SettingsSection title="Model Usage (30 days)">
            <div className="px-[var(--item-padding-x)] py-3">
              <div className="flex items-center gap-3 pb-2 mb-2 border-b border-border/40 text-xs font-medium text-muted-foreground">
                <div className="w-32">Model</div>
                <div className="flex-1">Usage</div>
                <div className="w-12 text-right">%</div>
                <div className="w-16 text-right">Cost</div>
              </div>
              {consolidated
                .sort((a, b) => b.percentage - a.percentage)
                .map((model) => (
                  <ModelUsageBar
                    key={model.model}
                    model={model.model}
                    percentage={model.percentage}
                    cost={model.totalCost}
                  />
                ))}
            </div>
          </SettingsSection>
        )
      })()}

      {/* External Tools */}
      <SettingsSection title="External Tools">
        <div className="grid gap-2 p-[var(--item-padding-x)] sm:grid-cols-2 lg:grid-cols-3">
          {externalTools.map((tool) => (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-colors"
            >
              <tool.icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{tool.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {tool.description}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          ))}
        </div>
      </SettingsSection>
    </PageContainer>
  )
}
