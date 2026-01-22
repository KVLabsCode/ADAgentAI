"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { BaseDropdown, FallbackInput } from "./base-dropdown"

/**
 * Compact select widget - h-7, dark theme.
 * Used for static enum dropdowns (platform, format, etc.) - no refresh needed.
 */
export function SelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, schema } = props

  const enumOptions = React.useMemo(() => {
    // RJSF passes enum options in different ways depending on context
    // 1. options.enumOptions - standard RJSF way
    // 2. schema.enum - from JSON Schema
    // 3. Direct from props for nested contexts

    // First check if RJSF provided enumOptions directly
    if (options?.enumOptions && Array.isArray(options.enumOptions)) {
      return options.enumOptions as { value: string; label: string }[]
    }

    // Check schema.enum (JSON Schema enum)
    if (schema?.enum && Array.isArray(schema.enum)) {
      return (schema.enum as unknown[])
        .filter((val): val is string => typeof val === "string")
        .map((val) => ({ value: val, label: val }))
    }

    // Check oneOf pattern (another JSON Schema pattern for enums)
    if (schema?.oneOf && Array.isArray(schema.oneOf)) {
      return (schema.oneOf as Array<{ const: string; title?: string }>)
        .filter((item) => typeof item.const === "string")
        .map((item) => ({ value: item.const, label: item.title || item.const }))
    }

    return []
  }, [options, schema])

  if (enumOptions.length === 0) {
    return (
      <FallbackInput
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        readonly={readonly}
        placeholder="Enter value..."
      />
    )
  }

  return (
    <BaseDropdown
      id={id}
      value={value}
      options={enumOptions}
      onChange={onChange}
      disabled={disabled}
      readonly={readonly}
    />
  )
}
