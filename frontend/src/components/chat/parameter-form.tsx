"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ParameterField, type SchemaProperty } from "./parameter-field"
import { TagInput } from "./tag-input"
import { useUser } from "@/contexts/user-context"

// JSON Schema object definition
export interface JSONSchema {
  type: "object"
  properties: Record<string, SchemaProperty>
  required?: string[]
}

interface ParameterFormProps {
  schema: JSONSchema
  initialValues: Record<string, unknown>
  onChange: (values: Record<string, unknown>, hasChanges: boolean, hasErrors: boolean) => void
  disabled?: boolean
  className?: string
}

/**
 * Dynamic form renderer based on JSON Schema.
 * Compact 2-column grid layout with modification tracking.
 * Uses useUser hook for auth context in dynamic field fetching.
 */
export function ParameterForm({
  schema,
  initialValues,
  onChange,
  disabled = false,
  className,
}: ParameterFormProps) {
  // Get auth context for dynamic field fetching
  const { getAccessToken, selectedOrganizationId } = useUser()
  const [accessToken, setAccessToken] = React.useState<string | null>(null)

  // Fetch access token on mount
  React.useEffect(() => {
    getAccessToken().then(setAccessToken)
  }, [getAccessToken])
  const [values, setValues] = React.useState<Record<string, unknown>>(initialValues)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Track if any values have changed from initial
  const hasChanges = React.useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues)
  }, [values, initialValues])

  // Validate all required fields on mount and when values change
  const hasErrors = React.useMemo(() => {
    const required = schema.required || []
    for (const name of required) {
      const value = values[name]
      if (value === undefined || value === null || value === "") {
        return true
      }
    }
    return Object.keys(errors).length > 0
  }, [schema.required, values, errors])

  // Notify parent of changes and validation state
  React.useEffect(() => {
    onChange(values, hasChanges, hasErrors)
  }, [values, hasChanges, hasErrors, onChange])

  // Inline validation for required fields and string lengths
  const validateField = React.useCallback((name: string, value: unknown): string | undefined => {
    const prop = schema.properties[name]
    const required = schema.required || []

    if (required.includes(name) && (value === undefined || value === null || value === "")) {
      return "Required"
    }
    if (typeof value === "string" && prop) {
      if (prop.minLength && value.length < prop.minLength) {
        return `Min ${prop.minLength} chars`
      }
      if (prop.maxLength && value.length > prop.maxLength) {
        return `Max ${prop.maxLength} chars`
      }
    }
    return undefined
  }, [schema.properties, schema.required])

  const handleFieldChange = React.useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))

    // Validate field and update errors
    const error = validateField(name, value)
    setErrors((prev) => {
      const next = { ...prev }
      if (error) {
        next[name] = error
      } else {
        delete next[name]
      }
      return next
    })
  }, [validateField])

  // Get sorted property entries (required first, then alphabetically)
  const sortedProperties = React.useMemo(() => {
    const required = schema.required || []
    return Object.entries(schema.properties).sort(([aName], [bName]) => {
      const aRequired = required.includes(aName)
      const bRequired = required.includes(bName)
      if (aRequired && !bRequired) return -1
      if (!aRequired && bRequired) return 1
      return aName.localeCompare(bName)
    })
  }, [schema.properties, schema.required])

  return (
    <div
      className={cn(
        "grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 items-start",
        "p-2 rounded-lg bg-zinc-800/30",
        className
      )}
    >
      {sortedProperties.map(([name, propSchema]) => {
        const value = values[name]
        const originalValue = initialValues[name]
        const error = errors[name]

        // Array fields use TagInput
        if (propSchema.type === "array") {
          const isModified = JSON.stringify(value) !== JSON.stringify(originalValue)
          const label = name
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())

          return (
            <React.Fragment key={name}>
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide py-1.5 truncate">
                {label}
              </span>
              <div
                className={cn(
                  "relative min-w-0",
                  isModified && "pl-2 -ml-2 border-l-2 border-amber-500/70"
                )}
              >
                <TagInput
                  value={Array.isArray(value) ? value : []}
                  onChange={(v) => handleFieldChange(name, v)}
                  placeholder={propSchema.description || `Add ${label.toLowerCase()}`}
                  disabled={disabled}
                />
                {error && (
                  <span className="block text-[9px] text-red-400 mt-0.5 truncate">
                    {error}
                  </span>
                )}
              </div>
            </React.Fragment>
          )
        }

        // All other fields use ParameterField
        return (
          <ParameterField
            key={name}
            name={name}
            schema={propSchema}
            value={value}
            originalValue={originalValue}
            onChange={(v) => handleFieldChange(name, v)}
            error={error}
            disabled={disabled}
            accessToken={accessToken}
            organizationId={selectedOrganizationId}
            formValues={values}
          />
        )
      })}

      {/* Changes indicator */}
      {hasChanges && (
        <div className="col-span-2 mt-1 pt-1 border-t border-zinc-700/30">
          <span className="text-[9px] text-amber-400/80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
            Modified from original
          </span>
        </div>
      )}
    </div>
  )
}

// Re-export types for consumers
export type { SchemaProperty } from "./parameter-field"
