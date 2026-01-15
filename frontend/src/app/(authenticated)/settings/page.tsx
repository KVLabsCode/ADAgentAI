"use client"

import * as React from "react"
import { PageContainer, PageHeader } from "@/components/ui/theme"
import { MyInvitationsSection } from "@/components/invitations"
import {
  OrganizationSection,
  AccountSection,
  ChatSettingsSection,
  AppearanceSection,
  NotificationsSection,
  PrivacySection,
} from "@/components/settings"

export default function SettingsPage() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Show skeleton layout while mounting to prevent flash
  if (!mounted) {
    return (
      <PageContainer>
        <PageHeader
          title="Settings"
          description="Manage your application preferences."
        />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded border border-border/30 p-4 animate-pulse">
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-48 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Manage your application preferences."
      />

      {/* Invitations To You - Shows pending invitations user has received */}
      <MyInvitationsSection />

      {/* Chat Display */}
      <ChatSettingsSection />

      {/* Organization */}
      <OrganizationSection />

      {/* Appearance */}
      <AppearanceSection />

      {/* Notifications */}
      <NotificationsSection />

      {/* Privacy */}
      <PrivacySection />

      {/* Account */}
      <AccountSection />
    </PageContainer>
  )
}
