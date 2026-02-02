"use client"

import { Switch } from "@/atoms/switch"
import { ConfigFieldGroup, ConfigField } from "@/organisms/theme"
import { useDemo } from "@/contexts/demo-mode-context"

export function DemoModeSection() {
  const { isDemoMode, toggleDemoMode } = useDemo()

  return (
    <ConfigFieldGroup>
      <ConfigField
        label="Demo mode"
        description="Preview the full app with synthetic data. No authentication required."
      >
        <Switch
          checked={isDemoMode}
          onCheckedChange={toggleDemoMode}
        />
      </ConfigField>
    </ConfigFieldGroup>
  )
}
