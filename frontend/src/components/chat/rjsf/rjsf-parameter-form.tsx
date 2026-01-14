"use client"

import * as React from "react"
import Form, { IChangeEvent } from "@rjsf/core"
import validator from "@rjsf/validator-ajv8"
import { RJSFSchema } from "@rjsf/utils"
import type { RJSFSchema as AppRJSFSchema } from "@/lib/types"
import { RefreshCw } from "lucide-react"
import { customWidgets } from "./widgets"
import { getParamDisplayName } from "@/lib/entity-config"
import { cn } from "@/lib/utils"

/**
 * Inline field template - label left, input right, compact height.
 * Uses friendly param names from entity-config.
 */
function FieldTemplate(props: {
  id: string
  label: string
  required: boolean
  children: React.ReactNode
  errors?: React.ReactNode
  hidden?: boolean
  displayLabel?: boolean
}) {
  const { id, label, required, children, errors, hidden, displayLabel = true } = props

  if (hidden) return <div className="hidden">{children}</div>

  // Extract field name from id (e.g., "root_account_id" → "account_id")
  const fieldName = id.replace(/^root_/, "")

  // Get friendly display name
  const displayName = getParamDisplayName(fieldName)

  return (
    <div className="flex items-center gap-2">
      {/* Label - fixed width, friendly name */}
      {displayLabel && label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-muted-foreground w-20 shrink-0"
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

// Compact vertical stack
function ObjectFieldTemplate(props: {
  properties: { content: React.ReactNode; name: string }[]
}) {
  const { properties } = props

  return (
    <div className="space-y-2">
      {properties.map((prop) => (
        <div key={prop.name}>{prop.content}</div>
      ))}
    </div>
  )
}

// Thin dark themed base input (h-7) with placeholder for refresh button to maintain consistent widths
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
    <div className="relative flex gap-1.5">
      <input
        id={id}
        type={type}
        value={value as string || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || readonly}
        placeholder={placeholder}
        className={cn(
          "flex h-7 flex-1 rounded border px-2 py-1 text-xs",
          "bg-transparent dark:bg-input/30 border-input",
          "text-foreground placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-[color,box-shadow]"
        )}
      />
      {/* Placeholder for refresh button to maintain consistent widths */}
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded border shrink-0",
          "bg-transparent dark:bg-input/30 border-input",
          "text-muted-foreground opacity-30"
        )}
        title="Text input"
      >
        <RefreshCw className="h-3 w-3" />
      </div>
    </div>
  )
}

// Suppress RJSF description field
function DescriptionFieldTemplate() {
  return null
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
      onChange?.(newFormData, hasChanges, hasErrors as boolean)
    },
    [onChange, initialValuesJson]
  )

  // Pass formData directly without useMemo to ensure fresh reference on every render
  // This ensures widgets always see the latest formData for dependency resolution
  const formContext = { formData }

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
