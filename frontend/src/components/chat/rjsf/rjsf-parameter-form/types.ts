import type { RJSFSchema as AppRJSFSchema } from "@/lib/types"

export interface RJSFParameterFormProps {
  rjsfSchema: AppRJSFSchema
  initialValues: Record<string, unknown>
  onChange?: (values: Record<string, unknown>, hasChanges: boolean, hasErrors: boolean) => void
  disabled?: boolean
  className?: string
}

export interface ArrayFieldContextValue {
  arrayFieldName: string
  isBidding: boolean
  isWaterfall: boolean
}

export interface FormContextValue {
  formData: Record<string, unknown>
  updateArrayItemField?: (arrayName: string, idx: number, field: string, value: unknown) => void
  updateArrayField?: (arrayName: string, newArray: unknown[]) => void
  enrichedFields?: Record<string, unknown>
}
