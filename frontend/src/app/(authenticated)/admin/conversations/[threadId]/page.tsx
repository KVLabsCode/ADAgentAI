"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  MessageSquare,
  User,
  Bot,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Wrench,
  Zap,
  DollarSign,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/atoms/button"
import { Badge } from "@/atoms/badge"
import { ScrollArea } from "@/molecules/scroll-area"
import { useUser } from "@/hooks/use-user"
import { authFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  PageContainer,
  StatCard,
  SettingsSection,
  LoadingSpinner,
  ErrorCard,
} from "@/organisms/theme"

// Types
interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  agentName: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface Run {
  id: string
  model: string | null
  service: string | null
  capability: string | null
  inputTokens: number
  outputTokens: number
  totalTokens: number
  toolCalls: number
  latencyMs: number | null
  status: "success" | "error" | "cancelled"
  errorMessage: string | null
  langsmithRunId: string | null
  totalCost: number | null
  createdAt: string
}

interface Session {
  id: string
  userId: string
  organizationId: string | null
  title: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

interface ConversationDetail {
  session: Session
  messages: Message[]
  runs: Run[]
}

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </Button>
  )
}

// Message bubble component
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"

  return (
    <div className={cn(
      "flex gap-3 group",
      isUser && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded border",
        isUser && "bg-muted border-border/50",
        !isUser && !isSystem && "bg-muted border-border/50",
        isSystem && "bg-amber-500/10 border-amber-500/30"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : isSystem ? (
          <AlertCircle className="h-4 w-4 text-amber-500" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 space-y-1 max-w-[80%]",
        isUser && "text-right"
      )}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground capitalize">
            {message.role}
            {message.agentName && ` (${message.agentName})`}
          </span>
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
          <CopyButton text={message.content} />
        </div>
        <div className={cn(
          "rounded border p-3 text-xs",
          isUser && "bg-muted/50 border-border/50",
          !isUser && !isSystem && "bg-card/50 border-border/50",
          isSystem && "bg-amber-500/5 border-amber-500/20"
        )}>
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Tool calls in metadata */}
        {message.metadata?.toolCalls && Array.isArray(message.metadata.toolCalls) ? (
          <div className="mt-2 space-y-1">
            {(message.metadata.toolCalls as Array<{ name: string; result?: string }>).map((tool, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-[10px] text-muted-foreground"
              >
                <Wrench className="h-3 w-3" />
                <span className="font-mono">{tool.name}</span>
                {tool.result && (
                  <Badge variant="outline" className="text-[10px] py-0">
                    completed
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// Run summary card
function RunCard({ run }: { run: Run }) {
  return (
    <div className="rounded border border-border/30 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px]",
              run.status === "success" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
              run.status === "error" && "bg-rose-500/10 text-rose-500 border-rose-500/30",
              run.status === "cancelled" && "bg-amber-500/10 text-amber-500 border-amber-500/30"
            )}
          >
            {run.status === "success" && <CheckCircle className="h-3 w-3 mr-1" />}
            {run.status === "error" && <AlertCircle className="h-3 w-3 mr-1" />}
            {run.status === "cancelled" && <Clock className="h-3 w-3 mr-1" />}
            {run.status}
          </Badge>
          {run.model && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {run.model.split("/").pop()}
            </span>
          )}
        </div>
        {run.langsmithRunId && (
          <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground" asChild>
            <a
              href={`https://smith.langchain.com/public/${run.langsmithRunId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
              Trace
            </a>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3 text-[10px]">
        <div>
          <p className="text-muted-foreground">Tokens</p>
          <p className="font-mono">{run.totalTokens.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tools</p>
          <p className="font-mono">{run.toolCalls}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Latency</p>
          <p className="font-mono">{run.latencyMs ? `${(run.latencyMs / 1000).toFixed(2)}s` : "-"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cost</p>
          <p className="font-mono">
            {run.totalCost ? `$${run.totalCost.toFixed(4)}` : "-"}
          </p>
        </div>
      </div>

      {run.errorMessage && (
        <div className="rounded bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-500">
          {run.errorMessage}
        </div>
      )}
    </div>
  )
}

// Format number helper
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function ConversationDetailPage() {
  const params = useParams()
  const threadId = params.threadId as string
  const { getAccessToken, selectedOrganizationId } = useUser()

  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [data, setData] = React.useState<ConversationDetail | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const fetchConversation = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const token = await getAccessToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      const response = await authFetch(
        `${apiUrl}/api/admin/conversations/${threadId}`,
        token,
        {},
        selectedOrganizationId
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Conversation not found")
        }
        throw new Error("Failed to fetch conversation")
      }

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error("Failed to fetch conversation:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [getAccessToken, selectedOrganizationId, threadId])

  React.useEffect(() => {
    fetchConversation()
  }, [fetchConversation])

  // Calculate totals from runs
  const totals = React.useMemo(() => {
    if (!data?.runs.length) return null
    return {
      tokens: data.runs.reduce((sum, r) => sum + r.totalTokens, 0),
      tools: data.runs.reduce((sum, r) => sum + r.toolCalls, 0),
      cost: data.runs.reduce((sum, r) => sum + (r.totalCost || 0), 0),
      latency: data.runs.reduce((sum, r) => sum + (r.latencyMs || 0), 0),
    }
  }, [data?.runs])

  if (isLoading) {
    return (
      <PageContainer size="lg">
        <LoadingSpinner label="Loading conversation..." />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer size="lg">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild className="gap-1 h-8 text-xs">
            <Link href="/admin/conversations">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
        </div>
        <ErrorCard
          title="Failed to load conversation"
          message={error}
          onRetry={() => fetchConversation()}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer size="lg">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="gap-1 h-8 text-xs">
              <Link href="/admin/conversations">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted border border-border/50">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-base font-medium tracking-tight">
                {data?.session.title || "Conversation Details"}
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Thread: {threadId.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchConversation(true)}
          disabled={isRefreshing}
          className="gap-2 h-8 text-xs"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {data && (
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Main Messages Column */}
          <div className="lg:col-span-2 space-y-3">
            {/* Session Info */}
            <SettingsSection title="Session Details">
              <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
                <div className="flex flex-wrap gap-4 text-[length:var(--text-small)]">
                  <div>
                    <p className="text-[length:var(--text-small)] text-muted-foreground uppercase tracking-wider">User ID</p>
                    <p className="font-mono">{data.session.userId.slice(0, 12)}...</p>
                  </div>
                  {data.session.organizationId && (
                    <div>
                      <p className="text-[length:var(--text-small)] text-muted-foreground uppercase tracking-wider">Org ID</p>
                      <p className="font-mono">{data.session.organizationId.slice(0, 12)}...</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[length:var(--text-small)] text-muted-foreground uppercase tracking-wider">Created</p>
                    <p className="font-mono">
                      {new Date(data.session.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[length:var(--text-small)] text-muted-foreground uppercase tracking-wider">Messages</p>
                    <p className="font-mono">{data.messages.length}</p>
                  </div>
                  {data.session.isArchived && (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[length:var(--text-small)]">
                      Archived
                    </Badge>
                  )}
                </div>
              </div>
            </SettingsSection>

            {/* Messages */}
            <SettingsSection title="Conversation Thread">
              <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
                <p className="text-[length:var(--text-description)] text-muted-foreground mb-4">{data.messages.length} messages</p>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4 py-2">
                    {data.messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </SettingsSection>
          </div>

          {/* Sidebar - Runs & Stats */}
          <div className="space-y-3">
            {/* Summary Stats */}
            {totals && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  title="Tokens"
                  value={formatNumber(totals.tokens)}
                  icon={Zap}
                  valueColor="success"
                />
                <StatCard
                  title="Cost"
                  value={`$${totals.cost.toFixed(4)}`}
                  icon={DollarSign}
                  valueColor="warning"
                />
                <StatCard
                  title="Tools"
                  value={totals.tools}
                  icon={Wrench}
                />
                <StatCard
                  title="Time"
                  value={`${(totals.latency / 1000).toFixed(1)}s`}
                  icon={Clock}
                />
              </div>
            )}

            {/* Run History */}
            <SettingsSection title="Run History">
              <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
                <p className="text-[length:var(--text-description)] text-muted-foreground mb-4">{data.runs.length} runs</p>
                {data.runs.length > 0 ? (
                  <ScrollArea className="h-[400px] pr-2">
                    <div className="space-y-3">
                      {data.runs.map((run) => (
                        <RunCard key={run.id} run={run} />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-[length:var(--text-small)] text-muted-foreground text-center py-8">
                    No run data available
                  </p>
                )}
              </div>
            </SettingsSection>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-muted-foreground">
        <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-mono">AUDIT LOG</span>
        <span>|</span>
        <span>Access recorded for compliance</span>
      </div>
    </PageContainer>
  )
}
