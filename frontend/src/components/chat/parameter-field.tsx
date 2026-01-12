"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchFieldOptions, type FieldOption } from "@/lib/api"
import { Loader2 } from "lucide-react"
import { MultiSelect } from "./multi-select"

// JSON Schema property definition with dynamic field extensions
export interface SchemaProperty {
  type: "string" | "number" | "integer" | "boolean" | "array"
  description?: string
  enum?: string[]
  default?: unknown
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  items?: SchemaProperty
  // Dynamic field extensions
  "x-dynamic"?: string  // accounts, apps, ad_units, ad_sources, mediation_groups
  "x-depends-on"?: string  // Field name that must be selected first
  "x-multi-select"?: boolean  // Allow multiple selections (comma-separated)
}

interface ParameterFieldProps {
  name: string
  schema: SchemaProperty
  value: unknown
  originalValue: unknown
  onChange: (value: unknown) => void
  error?: string
  disabled?: boolean
  // Context for dynamic field fetching
  accessToken?: string | null
  organizationId?: string | null
  formValues?: Record<string, unknown>  // Current form values for dependency resolution
}

/**
 * Compact field renderer based on JSON Schema type.
 * Renders appropriate input control with modification indicator.
 * Supports dynamic dropdowns via x-dynamic schema extension.
 */
export function ParameterField({
  name,
  schema,
  value,
  originalValue,
  onChange,
  error,
  disabled = false,
  accessToken,
  organizationId,
  formValues = {},
}: ParameterFieldProps) {
  const isModified = JSON.stringify(value) !== JSON.stringify(originalValue)
  const [dynamicOptions, setDynamicOptions] = React.useState<FieldOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [_allowManualInput, setAllowManualInput] = React.useState(false)
  const fetchIdRef = React.useRef(0) // Track current fetch to ignore stale responses

  // Format label: snake_case -> Title Case
  const label = name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

  // Resolve dependency value if needed
  const dependencyValue = schema["x-depends-on"]
    ? String(formValues[schema["x-depends-on"]] ?? "")
    : undefined

  // Stable reference for schema dynamic type
  const dynamicType = schema["x-dynamic"]
  const dependsOn = schema["x-depends-on"]

  // Create stable fetch key to prevent duplicate requests
  const fetchKey = React.useMemo(
    () => `${dynamicType}|${dependencyValue || ""}|${organizationId || ""}`,
    [dynamicType, dependencyValue, organizationId]
  )
  const lastFetchKeyRef = React.useRef<string>("")

  // Fetch dynamic options when needed (with ref to prevent stale updates)
  React.useEffect(() => {
    if (!dynamicType) return

    // Wait for access token before fetching
    if (!accessToken) {
      setIsLoading(true)
      return
    }

    // If there's a dependency and it's not set, don't fetch
    if (dependsOn && !dependencyValue) {
      setDynamicOptions([])
      setIsLoading(false)
      return
    }

    // Skip if we already fetched with these exact parameters
    if (lastFetchKeyRef.current === fetchKey) {
      return
    }
    lastFetchKeyRef.current = fetchKey

    // Increment fetch ID to track this specific request
    const currentFetchId = ++fetchIdRef.current
    setIsLoading(true)
    setDynamicOptions([]) // Clear previous options first

    const fetchOptions = async () => {
      try {
        const result = await fetchFieldOptions(
          dynamicType,
          accessToken,
          dependencyValue,
          organizationId
        )

        // Ignore if this isn't the latest fetch
        if (currentFetchId !== fetchIdRef.current) {
          console.log(`[parameter-field] Ignoring stale response for ${name} (fetchId ${currentFetchId} vs ${fetchIdRef.current})`)
          return
        }

        // Check for duplicates in API response (debugging)
        const rawCount = result.options.length
        const seen = new Set<string>()
        const uniqueOptions = result.options.filter((opt: FieldOption) => {
          if (seen.has(opt.value)) return false
          seen.add(opt.value)
          return true
        })

        if (rawCount !== uniqueOptions.length) {
          console.warn(`[parameter-field] Removed ${rawCount - uniqueOptions.length} duplicates from API response for ${name}`)
        }

        setDynamicOptions(uniqueOptions)
        setAllowManualInput(result.manual_input ?? false)
      } catch {
        if (currentFetchId !== fetchIdRef.current) return
        setDynamicOptions([])
        setAllowManualInput(true)
      } finally {
        if (currentFetchId === fetchIdRef.current) setIsLoading(false)
      }
    }

    fetchOptions()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchKey captures all relevant deps, dynamicOptions check uses ref
  }, [fetchKey, accessToken, dependsOn])

  // Parse comma-separated value to array for multi-select
  const multiSelectValue = React.useMemo(() => {
    if (!schema["x-multi-select"]) return []
    const strValue = String(value ?? "")
    return strValue ? strValue.split(",").map((v) => v.trim()).filter(Boolean) : []
  }, [schema, value])

  const renderInput = () => {
    // Dynamic field with multi-select → MultiSelect component
    if (schema["x-dynamic"] && schema["x-multi-select"] && dynamicOptions.length > 0) {
      return (
        <MultiSelect
          options={dynamicOptions.map((o) => ({ value: o.value, label: o.label }))}
          value={multiSelectValue}
          onChange={(selected) => onChange(selected.join(","))}
          placeholder="Select items..."
          disabled={disabled}
          isLoading={isLoading}
        />
      )
    }

    // Dynamic field with options → Single Select dropdown
    if (schema["x-dynamic"] && dynamicOptions.length > 0) {
      // Find matching option for current value (agent may have written raw ID)
      const currentValue = String(value ?? "").trim()
      const matchingOption = dynamicOptions.find(opt => opt.value === currentValue)

      // Debug: log if value doesn't match any option
      if (currentValue && !matchingOption) {
        console.warn(`[parameter-field] No matching option for value: "${currentValue}"`,
          dynamicOptions.map(o => o.value))
      }

      return (
        <Select
          value={currentValue}
          onValueChange={(v) => onChange(v)}
          disabled={disabled || isLoading}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              "h-7 text-[11px] bg-zinc-900/80 border-zinc-700/50",
              "focus:ring-amber-500/30 focus:border-amber-500/50",
              "w-full"
            )}
          >
            {/* Show matching label, or raw value as fallback, or placeholder */}
            <SelectValue placeholder={isLoading ? "Loading..." : "Select..."}>
              {matchingOption ? matchingOption.label : (currentValue || undefined)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {dynamicOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-[11px] text-zinc-200"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // Dynamic field loading or with manual fallback
    if (schema["x-dynamic"]) {
      const currentValue = String(value ?? "")

      if (isLoading) {
        return (
          <div className="flex items-center h-7 gap-2 text-[11px] text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            {/* Show current value while loading so user sees what agent selected */}
            <span className="truncate">{currentValue || "Loading options..."}</span>
          </div>
        )
      }

      // Waiting for dependency or no options available
      if (schema["x-depends-on"] && !dependencyValue) {
        return (
          <Input
            type="text"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            disabled={true}
            className={cn(
              "h-7 text-[11px] bg-zinc-900/80 border-zinc-700/50",
              "placeholder:text-zinc-600"
            )}
            placeholder={`Select ${schema["x-depends-on"].replace(/_/g, " ")} first`}
          />
        )
      }

      // Manual input fallback (no options returned)
      return (
        <Input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "h-7 text-[11px] bg-zinc-900/80 border-zinc-700/50",
            "focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50",
            "placeholder:text-zinc-600"
          )}
          placeholder={schema.description || `Enter ${label.toLowerCase()}`}
        />
      )
    }

    // Enum values → Select dropdown
    if (schema.enum && schema.enum.length > 0) {
      return (
        <Select
          value={String(value ?? "")}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              "h-7 text-[11px] bg-zinc-900/80 border-zinc-700/50",
              "focus:ring-amber-500/30 focus:border-amber-500/50",
              "w-full"
            )}
          >
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {schema.enum.map((option) => (
              <SelectItem
                key={option}
                value={option}
                className="text-[11px] text-zinc-200"
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // Boolean → Switch toggle
    if (schema.type === "boolean") {
      return (
        <div className="flex items-center h-7">
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
            disabled={disabled}
            className="data-[state=checked]:bg-emerald-600"
          />
          <span className="ml-2 text-[10px] text-zinc-400">
            {value ? "Enabled" : "Disabled"}
          </span>
        </div>
      )
    }

    // Number/Integer → Number input
    if (schema.type === "number" || schema.type === "integer") {
      return (
        <Input
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => {
            const num = schema.type === "integer"
              ? parseInt(e.target.value, 10)
              : parseFloat(e.target.value)
            onChange(isNaN(num) ? undefined : num)
          }}
          min={schema.minimum}
          max={schema.maximum}
          disabled={disabled}
          className={cn(
            "h-7 text-[11px] bg-zinc-900/80 border-zinc-700/50",
            "focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50",
            "placeholder:text-zinc-600"
          )}
          placeholder={schema.description || `Enter ${label.toLowerCase()}`}
        />
      )
    }

    // String (default) → Text input
    return (
      <Input
        type="text"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        maxLength={schema.maxLength}
        disabled={disabled}
        className={cn(
          "h-7 text-[11px] bg-zinc-900/80 border-zinc-700/50",
          "focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50",
          "placeholder:text-zinc-600"
        )}
        placeholder={schema.description || `Enter ${label.toLowerCase()}`}
      />
    )
  }

  return (
    <>
      {/* Label cell */}
      <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide py-1.5 truncate">
        {label}
      </span>

      {/* Input cell with modification indicator */}
      <div
        className={cn(
          "relative min-w-0",
          isModified && "pl-2 -ml-2 border-l-2 border-amber-500/70"
        )}
      >
        {renderInput()}
        {error && (
          <span className="block text-[9px] text-red-400 mt-0.5 truncate">
            {error}
          </span>
        )}
      </div>
    </>
  )
}
