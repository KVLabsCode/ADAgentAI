import * as React from "react"
import type { FieldTemplateProps } from "@rjsf/utils"
import { getParamDisplayName } from "@/lib/entity-config"
import type { FormContextValue } from "../types"

/**
 * Inline field template - label left, input right, compact height.
 * Uses friendly param names from entity-config.
 *
 * Supports conditional display via uiSchema:
 * "cpm_micros": { "ui:options": { "showWhen": { "pricing_mode": "FIXED" } } }
 */
export const FieldTemplate = React.memo(function FieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    label,
    required,
    children,
    errors: _errors,
    hidden,
    displayLabel = true,
    uiSchema,
    registry,
  } = props

  // Get formData from formContext for conditional display
  const formContext = registry?.formContext as FormContextValue | undefined
  const formData = formContext?.formData || {}

  // Check showWhen condition - hide field if condition not met
  const showWhen = uiSchema?.["ui:options"]?.showWhen as Record<string, string> | undefined
  if (showWhen) {
    // For nested array items, we need to get the parent item's formData
    // The id format is like "root_waterfall_lines_0_cpm_micros"
    // We need to check formData for the sibling field "pricing_mode"
    const arrayMatch = id.match(/root_(\w+)_(\d+)_(\w+)$/)

    for (const [field, expectedValue] of Object.entries(showWhen)) {
      let actualValue: unknown

      if (arrayMatch) {
        // Nested in array - get value from array item
        const [, arrayName, indexStr] = arrayMatch
        const arrayData = formData[arrayName] as Array<Record<string, unknown>> | undefined
        const index = parseInt(indexStr, 10)
        actualValue = arrayData?.[index]?.[field]
      } else {
        // Top-level field
        actualValue = formData[field]
      }

      if (actualValue !== expectedValue) {
        return null // Hide field
      }
    }
  }

  // Handle ui:widget: "hidden" from uiSchema
  const widgetName = uiSchema?.["ui:widget"] as string | undefined
  if (hidden || widgetName === "hidden") return null

  // Extract field name from id and get display name
  const displayName = getFieldDisplayName(id)

  return (
    <div className="flex items-center">
      {/* Label - fixed width, friendly name */}
      {displayLabel && label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-muted-foreground w-24 shrink-0 mr-2"
        >
          {displayName}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {/* Input - flex grow */}
      <div className="flex-1 min-w-0">{children}</div>
      {/* Errors inline - hidden, we use form-level validation instead */}
    </div>
  )
})

/**
 * Extract field name from id and get the friendly display name.
 * Handles nested array fields and object fields.
 */
function getFieldDisplayName(id: string): string {
  // Extract field name from id
  // For nested array fields like "root_mediation_group_lines_0_line_id", extract just "line_id"
  // For nested object fields like "root_advanced_targeting_targeted_region_codes", extract "targeted_region_codes"
  // For regular fields like "root_account_id", extract "account_id"
  let fieldName = id.replace(/^root_/, "")

  // Check for array index pattern (e.g., "_0_", "_1_", etc.) and extract the last field name
  const arrayIndexMatch = fieldName.match(/_(\d+)_(.+)$/)
  if (arrayIndexMatch) {
    fieldName = arrayIndexMatch[2] // Get the field name after the index
  }

  // For nested object fields, try to find the most specific field name that has a display mapping
  const parts = fieldName.split("_")
  let displayName = getParamDisplayName(fieldName)

  // If no exact match, try progressively shorter suffixes
  if (displayName === fieldName.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")) {
    // The fallback was used, try shorter versions
    for (let i = 1; i < parts.length; i++) {
      const suffix = parts.slice(i).join("_")
      const tryName = getParamDisplayName(suffix)
      // Check if this is not just the fallback transformation
      if (tryName !== suffix.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")) {
        displayName = tryName
        break
      }
    }
  }

  return displayName
}
