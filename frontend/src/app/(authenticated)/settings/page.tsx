"use client"

import * as React from "react"
import { PageContainer, PageHeader, SettingsSection } from "@/organisms/theme"
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
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 w-24 bg-muted/50 rounded mb-3" />
              <div className="rounded-lg border border-border/40 p-4 space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted/50 rounded" />
                  </div>
                  <div className="h-6 w-11 bg-muted rounded-full" />
                </div>
              </div>
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

      {/* Sections container with 48px gap between sections (Linear ground truth) */}
      <div className="flex flex-col gap-[var(--section-gap)]">
        {/* Invitations To You - Shows pending invitations user has received */}
        <MyInvitationsSection />

        {/* Chat Section */}
        <SettingsSection title="Chat">
          <ChatSettingsSection />
        </SettingsSection>

        {/* Organization Section */}
        <SettingsSection title="Organization">
          <OrganizationSection />
        </SettingsSection>

        {/* Interface Section */}
        <SettingsSection title="Interface">
          <AppearanceSection />
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title="Notifications">
          <NotificationsSection />
        </SettingsSection>

        {/* Privacy Section */}
        <SettingsSection title="Privacy">
          <PrivacySection />
        </SettingsSection>

        {/* Account Section */}
        <SettingsSection title="Account">
          <AccountSection />
        </SettingsSection>
      </div>
    </PageContainer>
  )
}
