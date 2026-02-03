import * as React from "react"
import { cn } from "@/lib/utils"

interface BaseInputTemplateProps {
  id: string
  value: unknown
  readonly?: boolean
  disabled?: boolean
  onChange: (value: unknown) => void
  type?: string
  placeholder?: string
}

/**
 * Thin dark themed base input (h-7).
 * Memoized to prevent re-renders when form data changes elsewhere.
 */
export const BaseInputTemplate = React.memo(function BaseInputTemplate(
  props: BaseInputTemplateProps
) {
  const { id, value, readonly, disabled, onChange, type = "text", placeholder } = props

  return (
    <input
      id={id}
      type={type}
      value={(value as string) || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || readonly}
      placeholder={placeholder}
      className={cn(
        "flex h-7 w-full rounded-[var(--input-radius)] border px-2 py-1 text-xs",
        "bg-[var(--input-bg)] border-[var(--input-border)]",
        "text-foreground placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-[color,box-shadow]"
      )}
    />
  )
})

/**
 * Suppress RJSF description field.
 * Returns null to hide all field descriptions.
 */
export const DescriptionFieldTemplate = React.memo(function DescriptionFieldTemplate() {
  return null
})
