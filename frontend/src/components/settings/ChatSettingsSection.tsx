"use client"

import { MessageSquare } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { SectionCard, SectionCardHeader, SectionCardContent, ConfigField } from "@/components/ui/theme"
import { useChatSettings } from "@/lib/chat-settings"

export function ChatSettingsSection() {
  const { displayMode, setDisplayMode } = useChatSettings()

  return (
    <SectionCard>
      <SectionCardHeader
        icon={MessageSquare}
        title="Chat Display"
        description="Configure how agent activity is displayed."
      />
      <SectionCardContent>
        <ConfigField
          label="Compact mode"
          description="Show thinking and tool calls in a single combined box."
        >
          <Switch
            checked={displayMode === "compact"}
            onCheckedChange={(checked) => setDisplayMode(checked ? "compact" : "detailed")}
          />
        </ConfigField>
      </SectionCardContent>
    </SectionCard>
  )
}
