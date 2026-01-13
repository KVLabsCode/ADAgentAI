"use client"

import * as React from "react"
import Form from "@rjsf/core"
import validator from "@rjsf/validator-ajv8"
import { RJSFSchema } from "@rjsf/utils"
import type { RJSFSchema as AppRJSFSchema } from "@/lib/types"
import { customWidgets } from "./widgets"
import { cn } from "@/lib/utils"

// Custom field template for dark theme styling
function FieldTemplate(props: {
  id: string
  label: string
  required: boolean
  description?: React.ReactNode
  children: React.ReactNode
  errors?: React.ReactNode
  help?: React.ReactNode
  hidden?: boolean
  displayLabel?: boolean
}) {
  const { id, label, required, description, children, errors, help, hidden, displayLabel = true } = props

  if (hidden) return <div className="hidden">{children}</div>

  return (
    <div className="space-y-1.5">
      {displayLabel && label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-zinc-300"
        >
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {description && (
        <p className="text-[10px] text-zinc-500">{description}</p>
      )}
      {help && (
        <p className="text-[10px] text-zinc-500">{help}</p>
      )}
      {errors && (
        <div className="text-[10px] text-red-400">{errors}</div>
      )}
    </div>
  )
}

// Custom object field template for form layout
function ObjectFieldTemplate(props: {
  title?: string
  description?: React.ReactNode
  properties: { content: React.ReactNode; name: string }[]
}) {
  const { properties } = props

  return (
    <div className="space-y-3">
      {properties.map((prop) => (
        <div key={prop.name}>{prop.content}</div>
      ))}
    </div>
  )
}

// Custom base input template for dark styling
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
        "flex h-9 w-full rounded-md border bg-zinc-800/50 px-3 py-1",
        "text-sm text-zinc-100 placeholder:text-zinc-500",
        "border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600",
        "disabled:cursor-not-allowed disabled:opacity-50"
      )}
    />
  )
}

interface RJSFParameterFormProps {
  /** RJSF schema with schema and uiSchema */
  rjsfSchema: AppRJSFSchema
  /** Initial form values */
  initialValues: Record<string, unknown>
  /** Callback when form data changes */
  onChange?: (values: Record<string, unknown>, hasChanges: boolean, hasErrors: boolean) => void
  /** Whether the form is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

/**
 * RJSF-based parameter form for tool approval.
 * Renders JSON Schema forms with custom widgets for dynamic fields.
 */
export function RJSFParameterForm({
  rjsfSchema,
  initialValues,
  onChange,
  disabled = false,
  className,
}: RJSFParameterFormProps) {
  const [formData, setFormData] = React.useState<Record<string, unknown>>(initialValues)
  // Stringify initial values once for comparison
  const [initialValuesJson] = React.useState(() => JSON.stringify(initialValues))

  // Handle form data change
  const handleChange = React.useCallback(
    (data: { formData: Record<string, unknown>; errors: unknown[] }) => {
      setFormData(data.formData)
      const hasErrors = data.errors && data.errors.length > 0
      const hasChanges = JSON.stringify(data.formData) !== initialValuesJson
      onChange?.(data.formData, hasChanges, hasErrors as boolean)
    },
    [onChange, initialValuesJson]
  )

  // Create form context with formData for widget access
  const formContext = React.useMemo(
    () => ({ formData }),
    [formData]
  )

  return (
    <div className={cn("rjsf-form", className)}>
      <Form
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
        }}
        formContext={formContext}
        disabled={disabled}
        liveValidate={false}
        showErrorList={false}
      >
        {/* Empty fragment to hide submit button - we handle submission externally */}
        <></>
      </Form>
    </div>
  )
}
