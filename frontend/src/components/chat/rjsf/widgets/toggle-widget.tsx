"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { BaseDropdown } from "./base-dropdown"

/**
 * Status dropdown widget for ENABLED/DISABLED state fields.
 * Uses BaseDropdown for consistent styling with other dropdowns.
 *
 * Usage in uiSchema:
 * "state": { "ui:widget": "ToggleWidget" }
 */
export function ToggleWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly } = props

  const options = React.useMemo(() => [
    { value: "ENABLED", label: "Enabled" },
    { value: "DISABLED", label: "Disabled" },
  ], [])

  return (
    <BaseDropdown
      id={id}
      value={value || "ENABLED"}
      options={options}
      onChange={onChange}
      disabled={disabled}
      readonly={readonly}
    />
  )
}
