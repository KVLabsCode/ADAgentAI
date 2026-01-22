"use client"

import * as React from "react"
import {
  MessageSquare,
  Users,
  Zap,
  Clock,
  Activity,
} from "lucide-react"
import {
  PageContainer,
  PageHeader,
  SettingsSection,
} from "@/organisms/theme"
import { StatCard } from "@/molecules/stat-card"

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
          title="Conversations"
          value="1,247"
          subValue="Total Conversations"
          change="+12%"
          changeType="positive"
          icon={MessageSquare}
          href="/admin/conversations"
        />
        <StatCard
          title="Users"
          value="89"
          subValue="Active Users"
          change="+5"
          changeType="positive"
          icon={Users}
          href="/admin/usage"
        />
        <StatCard
          title="Tokens"
          value="2.4M"
          subValue="Tokens Used"
          change="~$48"
          changeType="neutral"
          icon={Zap}
          href="/admin/usage"
        />
        <StatCard
          title="Response"
          value="1.2s"
          subValue="Avg Response Time"
          change="-0.3s"
          changeType="positive"
          icon={Clock}
        />
      </div>

      {/* System Status */}
      <SettingsSection title="System Status">
        <div className="px-[var(--item-padding-x)] py-[var(--item-padding-y)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                <Activity className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-[length:var(--text-label)] font-medium">All Systems Operational</p>
                <p className="text-[length:var(--text-small)] text-muted-foreground">Last checked: just now</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[length:var(--text-small)] text-success font-medium">Healthy</span>
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
                <span className="text-[length:var(--text-small)] font-medium">{service.name}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-[length:var(--text-small)] text-muted-foreground capitalize">{service.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingsSection>
    </PageContainer>
  )
}
