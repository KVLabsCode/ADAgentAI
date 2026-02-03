"use client"

import * as React from "react"
import { WidgetProps } from "@rjsf/utils"
import { useEntityData } from "@/contexts/entity-data-context"
import { useUser } from "@/contexts/user-context"
import { getParentField, getParamDisplayName } from "@/lib/entity-config"
import type { FieldFilterParams } from "@/lib/api"
import { BaseDropdown, FallbackInput, DependencyMessage } from "./base-dropdown"

/**
 * Entity select widget for async data fetching.
 * Uses shared BaseDropdown for consistent styling.
 * Fetches options from API with caching.
 *
 * Supports two types of dependencies:
 * 1. Structural dependencies (dependsOn): Parent-child relationships where changing
 *    parent means ALL child options change. Clears selection when parent changes.
 *    Example: account_id → app_id
 *
 * 2. Filter dependencies (filterBy): Filter criteria where changing filter may still
 *    leave some options valid. Keeps valid selections when filter changes.
 *    Example: ad_format → ad_unit_ids
 */
export function EntitySelectWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, options, registry } = props

  // RJSF v5+: formContext is accessed via registry.formContext, NOT props.formContext
  const formContext = (registry as { formContext?: { formData?: Record<string, unknown> } })?.formContext

  const fetchType = options?.fetchType as string | undefined

  // Get providers from context for instant accounts dropdown (Phase 1 optimization)
  const { providers, providersLoading } = useUser()

  // Normalize account IDs: "accounts/pub-XXX" -> "pub-XXX"
  // The LLM sends full path format, but dropdown options use short IDs
  const normalizeAccountId = React.useCallback((val: string | undefined): string | undefined => {
    if (!val) return val
    if (fetchType === "accounts" && val.startsWith("accounts/")) {
      return val.replace("accounts/", "")
    }
    return val
  }, [fetchType])

  // Denormalize for output: "pub-XXX" -> "accounts/pub-XXX" if original was that format
  const denormalizeAccountId = React.useCallback((val: string): string => {
    // If original value had prefix, preserve that format
    if (fetchType === "accounts" && value?.startsWith("accounts/") && !val.startsWith("accounts/")) {
      return `accounts/${val}`
    }
    return val
  }, [fetchType, value])

  // Normalized value for matching against dropdown options
  const normalizedValue = normalizeAccountId(value)

  // Stable empty object to avoid creating new reference each render
  const emptyFormData = React.useMemo<Record<string, unknown>>(() => ({}), [])

  const {
    getCachedEntities,
    fetchEntities,
    isLoading,
    getError,
    getDisplayName,
    prefetchDependentEntities,
  } = useEntityData()

  const explicitDependsOn = options?.dependsOn as string | undefined
  const dependsOn = explicitDependsOn ?? (fetchType ? getParentField(fetchType) : null)

  // Filter dependencies - fields that filter this field's options (don't clear selection)
  const filterBy = options?.filterBy as string[] | undefined // e.g., ["platform", "ad_format"]

  const formData = formContext?.formData || emptyFormData
  const dependencyValue = dependsOn ? (formData[dependsOn] as string | undefined) : undefined
  const parentId = dependencyValue ?? null

  // Build filter params from filterBy fields
  const filterParams = React.useMemo<FieldFilterParams | undefined>(() => {
    if (!filterBy || filterBy.length === 0) return undefined

    const params: FieldFilterParams = {}
    for (const field of filterBy) {
      const fieldValue = formData[field] as string | undefined
      if (fieldValue) {
        // Map field names to filter param keys
        if (field === "platform") params.platform = fieldValue
        else if (field === "ad_format" || field === "adFormat") params.adFormat = fieldValue
        else if (field === "app_id" || field === "appId") params.appId = fieldValue
      }
    }

    // Only return if we have at least one filter
    return Object.keys(params).length > 0 ? params : undefined
  }, [filterBy, formData])

  const cachedItems = React.useMemo(() => {
    if (!fetchType) return []
    return getCachedEntities(fetchType, parentId, filterParams)
  }, [fetchType, parentId, filterParams, getCachedEntities])

  const loading = fetchType ? isLoading(fetchType, parentId, filterParams) : false
  const error = fetchType ? getError(fetchType, parentId, filterParams) : null

  // Wrap onChange to handle denormalization (must be defined before useEffects that use it)
  const handleChange = React.useCallback((newValue: string) => {
    onChange(denormalizeAccountId(newValue))
  }, [onChange, denormalizeAccountId])

  React.useEffect(() => {
    if (!fetchType) return
    if (dependsOn && !dependencyValue) return
    fetchEntities(fetchType, parentId, false, filterParams)
  }, [fetchType, dependsOn, dependencyValue, parentId, filterParams, fetchEntities])

  // Clear selection when structural dependency (dependsOn) changes
  const prevDependencyRef = React.useRef(dependencyValue)
  React.useEffect(() => {
    if (dependsOn && prevDependencyRef.current !== dependencyValue) {
      if (prevDependencyRef.current !== undefined && normalizedValue) {
        handleChange("")
      }
      prevDependencyRef.current = dependencyValue
    }
  }, [dependsOn, dependencyValue, normalizedValue, handleChange])

  // Track if we've attempted a fetch for this configuration
  const fetchKey = `${fetchType}-${parentId}-${JSON.stringify(filterParams)}`
  const [fetchAttempted, setFetchAttempted] = React.useState(false)
  const prevFetchKeyRef = React.useRef(fetchKey)

  React.useEffect(() => {
    if (prevFetchKeyRef.current !== fetchKey) {
      setFetchAttempted(false)
      prevFetchKeyRef.current = fetchKey
    }
  }, [fetchKey])

  // Note: For filter dependencies (filterBy), we don't clear selection automatically.

  // Convert cached items to dropdown options
  const dropdownOptions = React.useMemo(() => {
    return cachedItems.map(item => ({
      value: item.id,
      label: item.name,
      disabled: item.disabled === true,
      comingSoon: item.comingSoon === true
    }))
  }, [cachedItems])

  // Mark as fetched when we have data or error
  React.useEffect(() => {
    if (dropdownOptions.length > 0 || error) {
      setFetchAttempted(true)
    }
  }, [dropdownOptions.length, error])

  const displayValue = React.useMemo(() => {
    if (!normalizedValue || !fetchType) return ""
    return getDisplayName(fetchType, normalizedValue, parentId)
  }, [normalizedValue, fetchType, parentId, getDisplayName])

  // Show loading if: explicitly loading, OR we haven't gotten data yet
  const showLoading = loading || (!fetchAttempted && dropdownOptions.length === 0)

  if (!fetchType) {
    return <FallbackInput id={id} value={normalizedValue ?? ""} onChange={handleChange} disabled={disabled} readonly={readonly} placeholder="Enter value..." />
  }

  // Phase 1 optimization: Use providers from context for instant accounts dropdown
  // This bypasses the API call for accounts, making it instant (~200ms -> 0ms)
  if (fetchType === "accounts") {
    const admobProviders = providers.filter(p => p.type === "admob")
    const accountOptions = admobProviders.map(p => ({
      value: p.identifiers?.publisherId || "",
      label: p.displayName || p.identifiers?.publisherId || "Unknown Account",
    }))

    // Get display value from providers
    const accountDisplayValue = normalizedValue
      ? admobProviders.find(p => p.identifiers?.publisherId === normalizedValue)?.displayName || normalizedValue
      : ""

    // Phase 3 optimization: Prefetch dependent entities when account is selected
    // This fetches apps, ad_units, etc. in parallel, reducing total form load time
    const handleAccountChange = (newValue: string) => {
      handleChange(newValue)
      if (newValue) {
        // Fire and forget - don't await, just start the prefetch
        prefetchDependentEntities(newValue)
      }
    }

    if (providersLoading && accountOptions.length === 0) {
      return (
        <BaseDropdown
          id={id}
          value=""
          options={[]}
          onChange={handleAccountChange}
          disabled={disabled}
          readonly={readonly}
          loading={true}
          displayValue=""
        />
      )
    }

    if (accountOptions.length === 0) {
      return <FallbackInput id={id} value={normalizedValue ?? ""} onChange={handleAccountChange} disabled={disabled} readonly={readonly} placeholder="No accounts connected" />
    }

    return (
      <BaseDropdown
        id={id}
        value={normalizedValue ?? ""}
        options={accountOptions}
        onChange={handleAccountChange}
        disabled={disabled}
        readonly={readonly}
        loading={false}
        displayValue={accountDisplayValue}
      />
    )
  }

  if (dependsOn && !dependencyValue) {
    return <DependencyMessage parentLabel={getParamDisplayName(dependsOn)} />
  }

  const hasData = dropdownOptions.length > 0
  if (error && !hasData) {
    return <FallbackInput id={id} value={normalizedValue ?? ""} onChange={handleChange} disabled={disabled} readonly={readonly} placeholder="Enter manually..." />
  }
  if (!hasData && !showLoading) {
    return <FallbackInput id={id} value={normalizedValue ?? ""} onChange={handleChange} disabled={disabled} readonly={readonly} placeholder="No options" />
  }

  return (
    <BaseDropdown
      id={id}
      value={normalizedValue ?? ""}
      options={dropdownOptions}
      onChange={handleChange}
      disabled={disabled}
      readonly={readonly}
      loading={showLoading}
      displayValue={displayValue}
    />
  )
}
