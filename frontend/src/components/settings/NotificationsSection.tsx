"use client"

import { Bell } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { SectionCard, SectionCardHeader, SectionCardContent, ConfigField } from "@/components/ui/theme"

export function NotificationsSection() {
  return (
    <SectionCard>
      <SectionCardHeader
        icon={Bell}
        title="Notifications"
        description="Configure how you receive updates."
      />
      <SectionCardContent className="space-y-3">
        <ConfigField
          label="Email notifications"
          description="Receive email updates about your ad performance."
        >
          <Switch defaultChecked />
        </ConfigField>
        <div className="border-t border-border/20 pt-3">
          <ConfigField
            label="Weekly digest"
            description="Get a weekly summary of your ad metrics."
          >
            <Switch />
          </ConfigField>
        </div>
      </SectionCardContent>
    </SectionCard>
  )
}
