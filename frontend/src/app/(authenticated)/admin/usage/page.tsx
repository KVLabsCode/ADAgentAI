"use client"

import * as React from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"
import {
  Activity,
  TrendingUp,
  Zap,
  DollarSign,
  Download,
  RefreshCw,
  Cpu,
} from "lucide-react"
import { Button } from "@/atoms/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/molecules/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/organisms/chart"
import {
  PageContainer,
  PageHeader,
  StatCard,
  SettingsSection,
  LoadingSpinner,
  ErrorCard,
} from "@/organisms/theme"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

// Types for API response
interface UsageMetrics {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  runCount: number
  cost: number
}

interface ModelUsage {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  runCount: number
  cost: number
}

interface TimelinePoint {
  date: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  runCount: number
  cost: number
}

interface TopUser {
  userId: string
  totalTokens: number
  cost: number
  runCount: number
}

interface ServiceUsage {
  service: string
  capability: string
  totalTokens: number
  runCount: number
}

interface UsageData {
  today: UsageMetrics
  week: UsageMetrics
  month: UsageMetrics
  byModel: ModelUsage[]
  timeline: TimelinePoint[]
  topUsers: TopUser[]
  byService: ServiceUsage[]
}

// Chart configurations - colorful
const timelineChartConfig = {
  inputTokens: {
    label: "Input",
    color: "hsl(190, 95%, 55%)",
  },
  outputTokens: {
    label: "Output",
    color: "hsl(45, 95%, 55%)",
  },
} satisfies ChartConfig

const modelChartConfig = {
  tokens: {
    label: "Tokens",
    color: "hsl(190, 95%, 55%)",
  },
  cost: {
    label: "Cost",
    color: "hsl(45, 95%, 55%)",
  },
} satisfies ChartConfig

// Format large numbers
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// Format currency
function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n)
}


// Model bar colors
const MODEL_COLORS: Record<string, string> = {
  "claude-sonnet": "hsl(190, 95%, 55%)",
  "claude-opus": "hsl(280, 85%, 65%)",
  "claude-haiku": "hsl(160, 85%, 50%)",
  "gemini": "hsl(45, 95%, 55%)",
  "gpt": "hsl(340, 85%, 60%)",
  default: "hsl(220, 70%, 60%)",
}

function getModelColor(model: string): string {
  const lowerModel = model.toLowerCase()
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (lowerModel.includes(key)) return color
  }
  return MODEL_COLORS.default
}

export default function UsagePage() {
  const { getAccessToken, selectedOrganizationId, isAuthenticated, isLoading: isAuthLoading } = useUser()
  const [timeRange, setTimeRange] = React.useState("30d")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [data, setData] = React.useState<UsageData | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const fetchUsageData = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const token = await getAccessToken()
      console.log('[Usage] Fetching with token:', token ? 'present' : 'null')

      if (!token) {
        console.warn('[Usage] No access token available')
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await authFetch(
        `${apiUrl}/api/admin/usage`,
        token,
        {},
        selectedOrganizationId
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Usage] API error:', response.status, errorText)
        throw new Error("Failed to fetch usage data")
      }

      const result = await response.json()
      console.log('[Usage] Data received:', {
        today: result.today?.totalTokens,
        week: result.week?.totalTokens,
        timelinePoints: result.timeline?.length,
        models: result.byModel?.length
      })
      setData(result)
      setError(null)
    } catch (err) {
      console.error("Failed to fetch usage:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [getAccessToken, selectedOrganizationId])

  // Wait for auth to be ready before fetching
  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      fetchUsageData()
    } else if (!isAuthLoading && !isAuthenticated) {
      setIsLoading(false)
    }
  }, [fetchUsageData, isAuthLoading, isAuthenticated])

  const handleExport = async () => {
    try {
      const token = await getAccessToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await authFetch(
        `${apiUrl}/api/admin/usage/export`,
        token,
        {},
        selectedOrganizationId
      )

      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `usage-export-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  // Calculate trend (mock for now - would compare to previous period)
  const weekTrend = data?.week.totalTokens
    ? data.week.totalTokens > (data.today.totalTokens * 7) ? "down" : "up"
    : "neutral"

  return (
    <PageContainer size="xl">
      {/* Header */}
      <PageHeader
        title="Usage Metrics"
        description="Real-time token consumption and cost analysis"
      >
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsageData(true)}
            disabled={isRefreshing}
            className="h-8 text-xs gap-2"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 text-xs gap-2"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </PageHeader>

      {isLoading ? (
        <LoadingSpinner label="Loading metrics..." />
      ) : error ? (
        <ErrorCard
          title="Failed to load usage data"
          message={error}
          onRetry={() => fetchUsageData()}
        />
      ) : data ? (
        <>
          {/* Metric Cards Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Today's Tokens"
              value={formatNumber(data.today.totalTokens)}
              subValue={`${data.today.runCount} runs`}
              icon={Zap}
              valueColor="success"
            />
            <StatCard
              title="Today's Cost"
              value={formatCurrency(data.today.cost)}
              subValue={`Avg ${formatCurrency(data.today.cost / Math.max(data.today.runCount, 1))}/run`}
              icon={DollarSign}
              valueColor="warning"
            />
            <StatCard
              title="Week Total"
              value={formatNumber(data.week.totalTokens)}
              subValue={formatCurrency(data.week.cost)}
              icon={TrendingUp}
              change={`${((data.week.totalTokens / 7) / Math.max(data.today.totalTokens, 1) * 100 - 100).toFixed(0)}% vs avg`}
              changeType={weekTrend === "up" ? "positive" : weekTrend === "down" ? "negative" : "neutral"}
            />
            <StatCard
              title="Month Total"
              value={formatNumber(data.month.totalTokens)}
              subValue={formatCurrency(data.month.cost)}
              icon={Activity}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-3 lg:grid-cols-3">
            {/* Timeline Chart - Takes 2 columns */}
            <div className="lg:col-span-2">
              <SettingsSection title="Token Usage Over Time">
                <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[length:var(--text-description)] text-muted-foreground">Input vs Output token distribution</p>
                    <div className="flex items-center gap-4 text-[length:var(--text-small)]">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "hsl(190, 95%, 55%)" }} />
                        <span className="text-muted-foreground">Input</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "hsl(45, 95%, 55%)" }} />
                        <span className="text-muted-foreground">Output</span>
                      </div>
                    </div>
                  </div>
                {data.timeline.length > 0 ? (
                  <ChartContainer config={timelineChartConfig} className="h-[280px] w-full">
                    <AreaChart
                      data={data.timeline}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="fillInput" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(190, 95%, 55%)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(190, 95%, 55%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fillOutput" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(45, 95%, 55%)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(45, 95%, 55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => formatNumber(value)}
                        width={50}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) =>
                              new Date(value).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })
                            }
                          />
                        }
                      />
                      <Area
                        dataKey="inputTokens"
                        type="monotone"
                        fill="url(#fillInput)"
                        stroke="hsl(190, 95%, 55%)"
                        strokeWidth={2}
                      />
                      <Area
                        dataKey="outputTokens"
                        type="monotone"
                        fill="url(#fillOutput)"
                        stroke="hsl(45, 95%, 55%)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Activity className="mx-auto h-8 w-8 opacity-50" />
                      <p className="mt-2 text-[length:var(--text-small)]">No timeline data available</p>
                    </div>
                  </div>
                )}
                </div>
              </SettingsSection>
            </div>

            {/* Model Breakdown */}
            <SettingsSection title="By Model">
              <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
                <p className="text-[length:var(--text-description)] text-muted-foreground mb-4">Token usage per LLM</p>
                {data.byModel.length > 0 ? (
                  <ChartContainer config={modelChartConfig} className="h-[280px] w-full">
                    <BarChart
                      data={data.byModel.slice(0, 6)}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <YAxis
                        dataKey="model"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        width={80}
                        tickFormatter={(value) => {
                          const parts = value.split("/")
                          const name = parts[parts.length - 1] || value
                          return name.length > 12 ? name.slice(0, 12) + "..." : name
                        }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                      />
                      <Bar dataKey="totalTokens" radius={[0, 4, 4, 0]}>
                        {data.byModel.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getModelColor(entry.model)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Cpu className="mx-auto h-8 w-8 opacity-50" />
                      <p className="mt-2 text-[length:var(--text-small)]">No model data available</p>
                    </div>
                  </div>
                )}
              </div>
            </SettingsSection>
          </div>

          {/* Bottom Row - Tables */}
          <div className="grid gap-3 lg:grid-cols-2">
            {/* Top Users */}
            <SettingsSection title="Top Users">
              <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
                <p className="text-[length:var(--text-description)] text-muted-foreground mb-4">Highest token consumers this period</p>
                {data.topUsers.length > 0 ? (
                  <div className="space-y-2">
                    {data.topUsers.slice(0, 5).map((user, idx) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between rounded border border-border/30 px-3 py-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-mono font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-mono text-sm truncate max-w-[180px]">
                              {user.userId.slice(0, 8)}...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.runCount} runs
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm text-foreground">
                            {formatNumber(user.totalTokens)}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {formatCurrency(user.cost)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    <p className="text-[length:var(--text-small)]">No user data available</p>
                  </div>
                )}
              </div>
            </SettingsSection>

            {/* Service Breakdown */}
            <SettingsSection title="By Service">
              <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
                <p className="text-[length:var(--text-description)] text-muted-foreground mb-4">Token usage by service and capability</p>
                {data.byService.length > 0 ? (
                  <div className="space-y-2">
                    {data.byService.slice(0, 5).map((service, idx) => {
                      const maxTokens = Math.max(...data.byService.map(s => s.totalTokens))
                      const percentage = (service.totalTokens / maxTokens) * 100

                      return (
                        <div
                          key={`${service.service}-${service.capability}-${idx}`}
                          className="space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[length:var(--text-label)]">
                            <span className="capitalize">
                              {service.service || "general"} / {service.capability || "general"}
                            </span>
                            <span className="font-mono text-foreground">
                              {formatNumber(service.totalTokens)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-foreground/50 transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    <p className="text-[length:var(--text-small)]">No service data available</p>
                  </div>
                )}
              </div>
            </SettingsSection>
          </div>
        </>
      ) : null}
    </PageContainer>
  )
}
