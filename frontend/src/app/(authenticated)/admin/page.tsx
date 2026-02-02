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
  Github,
  LayoutList,
  Video,
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

// Discord icon (not in Lucide)
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

// WhatsApp icon (not in Lucide)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

const teamCommunication = [
  {
    name: "Discord",
    description: "Team chat & community",
    url: "https://discord.gg/Ej6yrtGTex",
    icon: DiscordIcon,
  },
  {
    name: "WhatsApp",
    description: "Team group chat",
    url: "https://chat.whatsapp.com/YOUR_INVITE_CODE", // TODO: Replace with actual invite link
    icon: WhatsAppIcon,
  },
  {
    name: "Google Meet",
    description: "Start a new meeting",
    url: "https://meet.google.com/new",
    icon: Video,
  },
]

const externalTools = [
  {
    name: "Linear",
    description: "Project management & issues",
    url: "https://linear.app",
    icon: LayoutList,
  },
  {
    name: "GitHub",
    description: "Source code repository",
    url: "https://github.com/KVLabsCode/ADAgentAI",
    icon: Github,
  },
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

      {/* Team Communication */}
      <SettingsSection title="Team Communication">
        <div className="grid gap-2 p-[var(--item-padding-x)] sm:grid-cols-2 lg:grid-cols-3">
          {teamCommunication.map((tool) => (
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
