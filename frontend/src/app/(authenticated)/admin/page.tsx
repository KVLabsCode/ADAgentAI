"use client"

import * as React from "react"
import Link from "next/link"
import {
  MessageSquare,
  TrendingUp,
  Users,
  Zap,
  Clock,
  ArrowUpRight,
  Activity,
} from "lucide-react"
import {
  PageContainer,
  PageHeader,
  SectionCard,
  SectionCardHeader,
  SectionCardContent,
} from "@/components/ui/theme"
import { cn } from "@/lib/utils"

// Local StatCard with link support (extends theme StatCard pattern)
interface StatCardProps {
  title: string
  value: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: React.ElementType
  href?: string
}

function StatCard({ title, value, change, changeType = "neutral", icon: Icon, href }: StatCardProps) {
  const content = (
    <div
      className={cn(
        "p-4 rounded border border-border/50 bg-card",
        "transition-all duration-200",
        href && "hover:border-foreground/20 cursor-pointer group"
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{title}</span>
      </div>
      <p className="font-mono text-xl font-semibold tabular-nums">{value}</p>
      {change && (
        <p
          className={cn(
            "text-[10px] mt-1 flex items-center gap-1",
            changeType === "positive" && "text-emerald-500",
            changeType === "negative" && "text-rose-500",
            changeType === "neutral" && "text-muted-foreground"
          )}
        >
          {changeType === "positive" && <TrendingUp className="h-3 w-3" />}
          {change}
        </p>
      )}
      {href && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href} className="relative">{content}</Link>
  }

  return content
}

export default function AdminDashboardPage() {
  return (
    <PageContainer size="lg">
      {/* Header */}
      <PageHeader
        title="Admin Dashboard"
        description="Monitor system health, usage metrics, and manage configurations."
      />

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Conversations"
          value="1,247"
          change="+12% this week"
          changeType="positive"
          icon={MessageSquare}
          href="/admin/conversations"
        />
        <StatCard
          title="Active Users"
          value="89"
          change="+5 today"
          changeType="positive"
          icon={Users}
          href="/admin/usage"
        />
        <StatCard
          title="Tokens Used"
          value="2.4M"
          change="~$48.20 estimated"
          changeType="neutral"
          icon={Zap}
          href="/admin/usage"
        />
        <StatCard
          title="Avg Response Time"
          value="1.2s"
          change="-0.3s from last week"
          changeType="positive"
          icon={Clock}
        />
      </div>

      {/* System Status */}
      <SectionCard>
        <SectionCardHeader
          icon={Activity}
          title="System Status"
        >
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-500 font-medium">Healthy</span>
          </div>
        </SectionCardHeader>
        <SectionCardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-medium">All Systems Operational</p>
              <p className="text-[10px] text-muted-foreground">Last checked: just now</p>
            </div>
          </div>

          {/* Service Status */}
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { name: "Chat Agent", status: "operational" },
              { name: "API Server", status: "operational" },
              { name: "Database", status: "operational" },
            ].map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between rounded bg-muted/50 px-3 py-2"
              >
                <span className="text-xs font-medium">{service.name}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground capitalize">{service.status}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCardContent>
      </SectionCard>
    </PageContainer>
  )
}
