import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import type { IChangeEvent } from "@rjsf/core"

interface UseFormStateOptions {
  initialValues: Record<string, unknown>
  onChange?: (values: Record<string, unknown>, hasChanges: boolean, hasErrors: boolean) => void
}

interface UseFormStateReturn {
  formData: Record<string, unknown>
  handleChange: (data: IChangeEvent<Record<string, unknown>>) => void
  updateArrayItemField: (arrayName: string, index: number, field: string, value: unknown) => void
  updateArrayField: (arrayName: string, newArray: unknown[]) => void
  enrichedFields: Record<string, unknown>
  formKey: string
}

/**
 * Hook to manage RJSF form state, change tracking, and array field updates.
 * Handles baseline comparison for detecting actual user changes vs RJSF initialization.
 */
export function useFormState({
  initialValues,
  onChange,
}: UseFormStateOptions): UseFormStateReturn {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialValues)

  // Store baseline as RJSF-transformed data (set after first onChange)
  const baselineJson = useRef<string | null>(null)
  // Track mount state - RJSF fires onChange on mount with transformed data
  const changeCount = useRef(0)

  // Extract underscore-prefixed fields for passing via formContext
  // These are backend-enriched fields (e.g., _resolved_ad_units) that RJSF would filter out
  const enrichedFields = useMemo(() => {
    const fields: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(initialValues)) {
      if (key.startsWith("_")) {
        fields[key] = value
      }
    }
    return fields
  }, [initialValues])

  // Sync formData when initialValues change (e.g., after async parsing)
  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: sync form state when initialValues prop changes */
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      setFormData(initialValues)
      // Reset baseline when initialValues change
      baselineJson.current = null
      changeCount.current = 0
    }
  }, [initialValues])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = useCallback(
    (data: IChangeEvent<Record<string, unknown>>) => {
      const newFormData = data.formData ?? {}
      setFormData(newFormData)
      const hasErrors = data.errors && data.errors.length > 0

      changeCount.current += 1
      const newFormDataJson = JSON.stringify(newFormData)

      // First 2 onChange calls are from RJSF initialization - use as baseline
      if (changeCount.current <= 2) {
        baselineJson.current = newFormDataJson
        // Report no changes during initialization
        queueMicrotask(() => {
          onChange?.(newFormData, false, hasErrors as boolean)
        })
        return
      }

      // After initialization, compare with baseline (RJSF-transformed data)
      const hasChanges =
        baselineJson.current !== null && newFormDataJson !== baselineJson.current

      // Defer parent callback to avoid setState during render
      queueMicrotask(() => {
        onChange?.(newFormData, hasChanges, hasErrors as boolean)
      })
    },
    [onChange]
  )

  // Callback to update a field in an array item (used by ArrayFieldTemplate header toggle)
  const updateArrayItemField = useCallback(
    (arrayName: string, index: number, field: string, value: unknown) => {
      setFormData((prev) => {
        const newFormData = { ...prev }
        const array = [...((newFormData[arrayName] as unknown[]) || [])]
        array[index] = { ...(array[index] as Record<string, unknown>), [field]: value }
        newFormData[arrayName] = array

        // Trigger onChange with updated formData (deferred to avoid setState during render)
        const hasChanges =
          baselineJson.current !== null &&
          JSON.stringify(newFormData) !== baselineJson.current
        queueMicrotask(() => {
          onChange?.(newFormData, hasChanges, false)
        })

        return newFormData
      })
    },
    [onChange]
  )

  // Callback to update an entire array field (used by AdSourceToggleField)
  const updateArrayField = useCallback(
    (arrayName: string, newArray: unknown[]) => {
      setFormData((prev) => {
        const newFormData = { ...prev, [arrayName]: newArray }

        // Trigger onChange with updated formData (deferred to avoid setState during render)
        const hasChanges =
          baselineJson.current !== null &&
          JSON.stringify(newFormData) !== baselineJson.current
        queueMicrotask(() => {
          onChange?.(newFormData, hasChanges, false)
        })

        return newFormData
      })
    },
    [onChange]
  )

  // Generate a key based on whether formData has key fields populated
  // This forces remount when initial values become available
  const formKey = useMemo(() => {
    const hasAccountId = Boolean(formData.account_id)
    const hasNetworkCode = Boolean(formData.network_code)
    return `form-${hasAccountId ? "a" : "x"}-${hasNetworkCode ? "n" : "x"}`
  }, [formData.account_id, formData.network_code])

  return {
    formData,
    handleChange,
    updateArrayItemField,
    updateArrayField,
    enrichedFields,
    formKey,
  }
}
