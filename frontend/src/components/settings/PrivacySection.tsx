"use client"

import { Switch } from "@/atoms/switch"
import { ConfigFieldGroup, ConfigField } from "@/organisms/theme"

export function PrivacySection() {
  return (
    <ConfigFieldGroup>
      <ConfigField
        label="Usage analytics"
        description="Help improve ADAgentAI by sharing anonymous usage data."
      >
        <Switch defaultChecked />
      </ConfigField>
      <ConfigField
        label="Chat history"
        description="Store conversation history for future reference."
      >
        <Switch defaultChecked />
      </ConfigField>
    </ConfigFieldGroup>
  )
}
