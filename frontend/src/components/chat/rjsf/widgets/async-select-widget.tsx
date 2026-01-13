"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { fetchFieldOptions, FieldOption } from "@/lib/api"
import { useUser } from "@/contexts/user-context"

/**
 * RJSF custom widget for async select fields.
 * Fetches options from backend based on ui:options.fetchType
 *
 * Supports:
 * - fetchType: "accounts" | "apps" | "ad_units" | "ad_sources" | "mediation_groups" | "networks"
 * - dependsOn: field name that must be selected first (for cascading)
 * - multiSelect: allow multiple selections (comma-separated)
 */
export function AsyncSelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, formContext } = props
  const { getAccessToken, selectedOrganization } = useUser()

  const [loading, setLoading] = React.useState(false)
  const [fieldOptions, setFieldOptions] = React.useState<FieldOption[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [manualInput, setManualInput] = React.useState(false)

  // Extract ui:options
  const fetchType = options?.fetchType as string | undefined
  const dependsOn = options?.dependsOn as string | undefined
  // multiSelect option is available but not yet implemented
  const _multiSelect = options?.multiSelect as boolean | undefined
  void _multiSelect // suppress unused warning

  // Get dependency value from form data
  const formData = formContext?.formData || {}
  const dependencyValue = dependsOn ? formData[dependsOn] : undefined

  // Fetch options when component mounts or dependency changes
  React.useEffect(() => {
    if (!fetchType) {
      setManualInput(true)
      return
    }

    // If has dependency and it's not set, wait
    if (dependsOn && !dependencyValue) {
      setFieldOptions([])
      return
    }

    const loadOptions = async () => {
      setLoading(true)
      setError(null)

      try {
        const accessToken = await getAccessToken()
        const response = await fetchFieldOptions(
          fetchType,
          accessToken,
          dependencyValue,
          selectedOrganization?.id
        )

        if (response.manual_input) {
          setManualInput(true)
          setFieldOptions([])
        } else {
          setFieldOptions(response.options)
          setManualInput(false)
        }
      } catch (err) {
        console.error("[AsyncSelectWidget] Error fetching options:", err)
        setError("Failed to load options")
        setManualInput(true)
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [fetchType, dependsOn, dependencyValue, getAccessToken, selectedOrganization?.id])

  // Reset value when dependency changes
  React.useEffect(() => {
    if (dependsOn && value) {
      // Don't auto-clear - let user decide
    }
  }, [dependencyValue, dependsOn, value])

  // Show manual input if no fetch type or fallback
  if (manualInput || !fetchType) {
    return (
      <Input
        id={id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || readonly}
        placeholder={dependsOn && !dependencyValue ? `Select ${dependsOn} first` : "Enter value..."}
        className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
      />
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-zinc-700 bg-zinc-800/50">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
        <span className="text-sm text-zinc-500">Loading options...</span>
      </div>
    )
  }

  // Waiting for dependency
  if (dependsOn && !dependencyValue) {
    return (
      <div className="h-9 px-3 rounded-md border border-zinc-700 bg-zinc-800/30 flex items-center">
        <span className="text-sm text-zinc-500">
          Select {dependsOn.replace(/_/g, " ")} first
        </span>
      </div>
    )
  }

  // Error state - show manual input
  if (error) {
    return (
      <div className="space-y-1">
        <Input
          id={id}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || readonly}
          placeholder="Enter value manually..."
          className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
        />
        <p className="text-xs text-red-400">{error}</p>
      </div>
    )
  }

  // No options available
  if (fieldOptions.length === 0) {
    return (
      <Input
        id={id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || readonly}
        placeholder="No options available - enter manually"
        className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
      />
    )
  }

  // Render select
  return (
    <Select
      value={value || ""}
      onValueChange={onChange}
      disabled={disabled || readonly}
    >
      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-100">
        <SelectValue placeholder="Select an option..." />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-700">
        {fieldOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
