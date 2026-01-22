"use client"

import { WidgetProps } from "@rjsf/utils"
import { BaseDropdown } from "./base-dropdown"

const PLATFORM_OPTIONS = [
  { value: "ANDROID", label: "Android" },
  { value: "IOS", label: "iOS" },
]

/**
 * Platform selector widget - simple dropdown.
 *
 * Usage in uiSchema:
 * "platform": { "ui:widget": "PlatformWidget" }
 */
export function PlatformWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly } = props

  return (
    <BaseDropdown
      id={id}
      value={value}
      options={PLATFORM_OPTIONS}
      onChange={onChange}
      disabled={disabled}
      readonly={readonly}
    />
  )
}
