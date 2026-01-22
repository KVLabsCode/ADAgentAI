"use client"

import { Switch } from "@/atoms/switch"
import { ConfigFieldGroup, ConfigField } from "@/organisms/theme"

export function NotificationsSection() {
  return (
    <ConfigFieldGroup>
      <ConfigField
        label="Email notifications"
        description="Receive email updates about your ad performance."
      >
        <Switch defaultChecked />
      </ConfigField>
      <ConfigField
        label="Weekly digest"
        description="Get a weekly summary of your ad metrics."
      >
        <Switch />
      </ConfigField>
    </ConfigFieldGroup>
  )
}
