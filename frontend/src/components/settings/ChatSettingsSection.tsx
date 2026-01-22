"use client"

import { Switch } from "@/atoms/switch"
import { ConfigFieldGroup, ConfigField } from "@/organisms/theme"
import { useChatSettings } from "@/lib/chat-settings"

export function ChatSettingsSection() {
  const { displayMode, setDisplayMode, safeMode, setSafeMode } = useChatSettings()

  return (
    <ConfigFieldGroup>
      <ConfigField
        label="Compact mode"
        description="Show thinking and tool calls in a single combined box."
      >
        <Switch
          checked={displayMode === "compact"}
          onCheckedChange={(checked) => setDisplayMode(checked ? "compact" : "detailed")}
        />
      </ConfigField>
      <ConfigField
        label="Safe mode"
        description="Block all write operations for read-only access."
      >
        <Switch
          checked={safeMode}
          onCheckedChange={setSafeMode}
        />
      </ConfigField>
    </ConfigFieldGroup>
  )
}
