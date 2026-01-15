"use client"

import { Shield } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { SectionCard, SectionCardHeader, SectionCardContent, ConfigField } from "@/components/ui/theme"

export function PrivacySection() {
  return (
    <SectionCard>
      <SectionCardHeader
        icon={Shield}
        title="Privacy"
        description="Manage your data and privacy settings."
      />
      <SectionCardContent className="space-y-3">
        <ConfigField
          label="Usage analytics"
          description="Help improve ADAgentAI by sharing anonymous usage data."
        >
          <Switch defaultChecked />
        </ConfigField>
        <div className="border-t border-border/20 pt-3">
          <ConfigField
            label="Chat history"
            description="Store conversation history for future reference."
          >
            <Switch defaultChecked />
          </ConfigField>
        </div>
      </SectionCardContent>
    </SectionCard>
  )
}
