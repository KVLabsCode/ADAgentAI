"use client"

import * as React from "react"
import Form, { IChangeEvent } from "@rjsf/core"
import validator from "@rjsf/validator-ajv8"
import { RJSFSchema, ArrayFieldTemplateProps, ArrayFieldItemTemplateProps, FieldTemplateProps, ObjectFieldTemplateProps } from "@rjsf/utils"
import type { RJSFSchema as AppRJSFSchema } from "@/lib/types"
import { Plus, Trash2, ChevronDown, ChevronRight, Power } from "lucide-react"
import { customWidgets } from "./widgets"
import { getParamDisplayName } from "@/lib/entity-config"
import { cn } from "@/lib/utils"

// Context to pass array field info from ArrayFieldTemplate to ArrayFieldItemTemplate
interface ArrayFieldContextValue {
  arrayFieldName: string
  isBidding: boolean
  isWaterfall: boolean
}
const ArrayFieldContext = React.createContext<ArrayFieldContextValue | null>(null)

/**
 * Inline field template - label left, input right, compact height.
 * Uses friendly param names from entity-config.
 *
 * Supports conditional display via uiSchema:
 * "cpm_micros": { "ui:options": { "showWhen": { "pricing_mode": "FIXED" } } }
 */
function FieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    label,
    required,
    children,
    errors,
    hidden,
    displayLabel = true,
    uiSchema,
    registry,
  } = props

  // Get formData from formContext for conditional display
  const formContext = registry?.formContext as { formData?: Record<string, unknown> } | undefined
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

  // Note: state/platform fields now use custom widgets (ToggleWidget, PlatformWidget) with labels

  // Handle ui:widget: "hidden" from uiSchema
  const widgetName = uiSchema?.["ui:widget"] as string | undefined
  if (hidden || widgetName === "hidden") return null

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
  // e.g., "advanced_targeting_targeted_region_codes" → try "targeted_region_codes" first
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

  return (
    <div className="flex items-center gap-2">
      {/* Label - fixed width, friendly name */}
      {displayLabel && label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-muted-foreground w-24 shrink-0"
        >
          {displayName}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {/* Input - flex grow */}
      <div className="flex-1 min-w-0">{children}</div>
      {/* Errors inline */}
      {errors && (
        <div className="text-[10px] text-destructive shrink-0">{errors}</div>
      )}
    </div>
  )
}

/**
 * Object field template with optional collapsible support.
 *
 * For regular objects: renders as compact vertical stack
 * For collapsible objects (ui:options.collapsible): renders with expand/collapse header
 */
function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { properties, uiSchema, title, fieldPathId } = props

  // Check if this object should be collapsible
  const isCollapsible = uiSchema?.["ui:options"]?.collapsible === true
  const defaultCollapsed = uiSchema?.["ui:options"]?.defaultCollapsed === true
  const displayTitle = (uiSchema?.["ui:title"] as string) || title || "Options"

  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

  // For root object or non-collapsible objects, render normally
  // fieldPathId.$id is "root" for root level objects
  const isRoot = !fieldPathId || fieldPathId.$id === "root"
  if (!isCollapsible || isRoot) {
    return (
      <div className="space-y-2">
        {properties.map((prop) => (
          <div key={prop.name}>{prop.content}</div>
        ))}
      </div>
    )
  }

  // Render collapsible section
  return (
    <div className={cn(
      "rounded-lg border border-input/50 bg-muted/5"
    )}>
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 text-left",
          "hover:bg-muted/10 transition-colors",
          "text-sm font-medium text-muted-foreground"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        <span>{displayTitle}</span>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-3 pb-3 pt-1 border-t border-input/50 space-y-2">
          {properties.map((prop) => (
            <div key={prop.name}>{prop.content}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// Thin dark themed base input (h-7)
function BaseInputTemplate(props: {
  id: string
  value: unknown
  readonly?: boolean
  disabled?: boolean
  onChange: (value: unknown) => void
  type?: string
  placeholder?: string
}) {
  const { id, value, readonly, disabled, onChange, type = "text", placeholder } = props

  return (
    <input
      id={id}
      type={type}
      value={value as string || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || readonly}
      placeholder={placeholder}
      className={cn(
        "flex h-7 w-full rounded border px-2 py-1 text-xs",
        "bg-transparent dark:bg-input/30 border-input",
        "text-foreground placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-[color,box-shadow]"
      )}
    />
  )
}

// Suppress RJSF description field
function DescriptionFieldTemplate() {
  return null
}

/**
 * ArrayFieldItemTemplate - handles per-item rendering in v6.
 * In RJSF v6, this is where we customize individual array items.
 * Includes collapsible header, status toggle, and delete button.
 */
function ArrayFieldItemTemplate(props: ArrayFieldItemTemplateProps) {
  const { children, index, registry, buttonsProps } = props
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  // Get array field context from parent ArrayFieldTemplate
  const arrayContext = React.useContext(ArrayFieldContext)

  // Get formContext for data and callbacks
  const formContext = registry?.formContext as {
    formData?: Record<string, unknown>
    updateArrayItemField?: (arrayName: string, idx: number, field: string, value: unknown) => void
  } | undefined

  const formData = formContext?.formData || {}
  const arrayFieldName = arrayContext?.arrayFieldName || ""

  // Get item data from form data
  const arrayData = formData[arrayFieldName] as Array<Record<string, unknown>> | undefined
  const itemFormData = arrayData?.[index]

  // Determine item type for labels from context
  const isBidding = arrayContext?.isBidding ?? false
  const isWaterfall = arrayContext?.isWaterfall ?? false

  const itemLabel = (itemFormData?.display_name as string) || `${isBidding ? "Bidder" : isWaterfall ? "Network" : "Line"} ${index + 1}`
  const itemState = (itemFormData?.state as string) || "ENABLED"
  const isEnabled = itemState === "ENABLED"

  return (
    <div className="border border-input rounded bg-background/80">
      {/* Collapsible header */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer",
          "hover:bg-muted/10 transition-colors"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {!isCollapsed ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-xs font-medium flex-1 truncate text-foreground">
          {itemLabel}
        </span>
        {/* Status toggle - square Power button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            formContext?.updateArrayItemField?.(
              arrayFieldName,
              index,
              "state",
              isEnabled ? "DISABLED" : "ENABLED"
            )
          }}
          className={cn(
            "h-7 w-7 rounded flex items-center justify-center transition-colors shrink-0",
            isEnabled
              ? "bg-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500/40"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
          title={isEnabled ? "Enabled - click to disable" : "Disabled - click to enable"}
        >
          <Power className="h-3.5 w-3.5" />
        </button>
        {/* Delete button */}
        {buttonsProps?.hasRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              buttonsProps.onRemoveItem(e)
            }}
            className={cn(
              "h-7 w-7 rounded flex items-center justify-center transition-colors shrink-0",
              "text-destructive/70 hover:text-destructive",
              "hover:bg-destructive/10"
            )}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "px-3 pb-3 pt-3 border-t border-input/50 space-y-2",
        isCollapsed && "hidden"
      )}>
        {children}
      </div>
    </div>
  )
}

/**
 * Array field template with collapsible section header.
 * In RJSF v6, items are already rendered by ArrayFieldItemTemplate.
 * We just render the section wrapper and {items} directly.
 */
function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const { items, canAdd, onAddClick, title, schema, uiSchema, registry, fieldPathId } = props
  const [sectionCollapsed, setSectionCollapsed] = React.useState(false)

  // Get display title - prefer uiSchema ui:title, then fallback to schema title
  const uiTitle = uiSchema?.["ui:title"] as string | undefined
  const schemaTitle = (schema as { title?: string }).title
  const fieldName = title || schemaTitle || "Items"

  // Extract actual array field name from fieldPathId (e.g., "root_bidding_lines" -> "bidding_lines")
  const fieldPathIdStr = fieldPathId?.$id || ""
  const arrayFieldName = fieldPathIdStr.replace(/^root_/, "") || fieldName.toLowerCase().replace(/\s+/g, "_")

  // Use uiTitle if provided (may include emoji), otherwise format field name
  const displayTitle = uiTitle || getParamDisplayName(arrayFieldName)

  // Determine if this is bidding or waterfall for customized empty state and button
  const isBidding = fieldName.toLowerCase().includes("bidding")
  const isWaterfall = fieldName.toLowerCase().includes("waterfall")
  const addButtonText = isBidding ? "Add Bidder" : isWaterfall ? "Add Network" : "Add Line"
  const emptyMessage = isBidding
    ? "No bidding networks configured. Click \"Add Bidder\" to add a real-time auction participant."
    : isWaterfall
    ? "No waterfall networks configured. Click \"Add Network\" to add a priority-based ad source."
    : "No lines configured. Click \"Add Line\" to add an entry."

  // Get item count from formData
  const formContext = registry?.formContext as { formData?: Record<string, unknown> } | undefined
  const formData = formContext?.formData || {}
  const itemCount = Array.isArray(formData[arrayFieldName]) ? (formData[arrayFieldName] as unknown[]).length : items.length

  return (
    <div className={cn(
      "rounded-lg border",
      "bg-muted/30 border-border/50"
    )}>
      {/* Section header - clickable to collapse */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 cursor-pointer",
          "hover:bg-muted/50 transition-colors",
          "border-b border-border/30",
          sectionCollapsed && "border-b-0"
        )}
        onClick={() => setSectionCollapsed(!sectionCollapsed)}
      >
        <div className="flex items-center gap-2">
          {sectionCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            {displayTitle}
          </span>
          <span className="text-xs text-muted-foreground">
            ({itemCount})
          </span>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAddClick()
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs",
              "bg-muted/50 text-foreground hover:bg-muted border border-border/50",
              "transition-colors"
            )}
          >
            <Plus className="h-3 w-3" />
            {addButtonText}
          </button>
        )}
      </div>

      {/* Section content - in v6, just render {items} directly */}
      {!sectionCollapsed && (
        <div className="p-3 space-y-2">
          {itemCount === 0 ? (
            <div className="text-xs text-muted-foreground/60 italic py-2 px-3 border border-dashed border-input/30 rounded bg-background/30">
              {emptyMessage}
            </div>
          ) : (
            <ArrayFieldContext.Provider value={{ arrayFieldName, isBidding, isWaterfall }}>
              <div className="space-y-2">
                {items}
              </div>
            </ArrayFieldContext.Provider>
          )}
        </div>
      )}
    </div>
  )
}

interface RJSFParameterFormProps {
  rjsfSchema: AppRJSFSchema
  initialValues: Record<string, unknown>
  onChange?: (values: Record<string, unknown>, hasChanges: boolean, hasErrors: boolean) => void
  disabled?: boolean
  className?: string
}

export function RJSFParameterForm({
  rjsfSchema,
  initialValues,
  onChange,
  disabled = false,
  className,
}: RJSFParameterFormProps) {
  const [formData, setFormData] = React.useState<Record<string, unknown>>(initialValues)
  const [initialValuesJson, setInitialValuesJson] = React.useState(() => JSON.stringify(initialValues))

  // Extract underscore-prefixed fields for passing via formContext
  // These are backend-enriched fields (e.g., _resolved_ad_units) that RJSF would filter out
  const enrichedFields = React.useMemo(() => {
    const fields: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(initialValues)) {
      if (key.startsWith("_")) {
        fields[key] = value
      }
    }
    return fields
  }, [initialValues])

  // Sync formData when initialValues change (e.g., after async parsing)
  React.useEffect(() => {
    const newJson = JSON.stringify(initialValues)
    if (newJson !== initialValuesJson && Object.keys(initialValues).length > 0) {
      setFormData(initialValues)
      setInitialValuesJson(newJson)
    }
  }, [initialValues, initialValuesJson])

  const handleChange = React.useCallback(
    (data: IChangeEvent<Record<string, unknown>>) => {
      const newFormData = data.formData ?? {}
      setFormData(newFormData)
      const hasErrors = data.errors && data.errors.length > 0
      const hasChanges = JSON.stringify(newFormData) !== initialValuesJson
      // Defer parent callback to avoid setState during render
      queueMicrotask(() => {
        onChange?.(newFormData, hasChanges, hasErrors as boolean)
      })
    },
    [onChange, initialValuesJson]
  )

  // Callback to update a field in an array item (used by ArrayFieldTemplate header toggle)
  const updateArrayItemField = React.useCallback(
    (arrayName: string, index: number, field: string, value: unknown) => {
      setFormData((prev) => {
        const newFormData = { ...prev }
        const array = [...((newFormData[arrayName] as unknown[]) || [])]
        array[index] = { ...(array[index] as Record<string, unknown>), [field]: value }
        newFormData[arrayName] = array

        // Trigger onChange with updated formData (deferred to avoid setState during render)
        const hasChanges = JSON.stringify(newFormData) !== initialValuesJson
        queueMicrotask(() => {
          onChange?.(newFormData, hasChanges, false)
        })

        return newFormData
      })
    },
    [onChange, initialValuesJson]
  )

  // Pass formData, enrichedFields, and callbacks to templates via formContext
  // enrichedFields contains backend-resolved data like _resolved_ad_units
  const formContext = { formData, updateArrayItemField, enrichedFields }

  // Generate a key based on whether formData has key fields populated
  // This forces remount when initial values become available
  const formKey = React.useMemo(() => {
    const hasAccountId = Boolean(formData.account_id)
    const hasNetworkCode = Boolean(formData.network_code)
    return `form-${hasAccountId ? 'a' : 'x'}-${hasNetworkCode ? 'n' : 'x'}`
  }, [formData.account_id, formData.network_code])

  return (
    <div className={cn("rjsf-form", className)}>
      <Form
        key={formKey}
        schema={rjsfSchema.schema as RJSFSchema}
        uiSchema={rjsfSchema.uiSchema}
        formData={formData}
        onChange={handleChange}
        validator={validator}
        widgets={customWidgets}
        templates={{
          FieldTemplate,
          ObjectFieldTemplate,
          ArrayFieldTemplate,
          ArrayFieldItemTemplate,
          BaseInputTemplate,
          DescriptionFieldTemplate,
        }}
        formContext={formContext}
        disabled={disabled}
        liveValidate={false}
        showErrorList={false}
      >
        <></>
      </Form>
    </div>
  )
}
