"use client"

import * as React from "react"
import Form from "@rjsf/core"
import validator from "@rjsf/validator-ajv8"
import type { RJSFSchema } from "@rjsf/utils"
import { customWidgets, customFields } from "../widgets"
import { cn } from "@/lib/utils"
import type { RJSFParameterFormProps } from "./types"
import { useFormState } from "./hooks"
import {
  FieldTemplate,
  ObjectFieldTemplate,
  ArrayFieldTemplate,
  ArrayFieldItemTemplate,
  BaseInputTemplate,
  DescriptionFieldTemplate,
} from "./templates"

/**
 * RJSF Parameter Form - A customized React JSON Schema Form for editing
 * AdMob/GAM entity parameters with dark theme, collapsible sections,
 * and array field management.
 *
 * Features:
 * - Inline field layout (label left, input right)
 * - Collapsible object and array sections
 * - Status toggle and delete buttons for array items
 * - Conditional field display via showWhen
 * - Change tracking with baseline comparison
 */
export function RJSFParameterForm({
  rjsfSchema,
  initialValues,
  onChange,
  disabled = false,
  className,
}: RJSFParameterFormProps) {
  const {
    formData,
    handleChange,
    updateArrayItemField,
    updateArrayField,
    enrichedFields,
    formKey,
  } = useFormState({ initialValues, onChange })

  // Pass formData, enrichedFields, and callbacks to templates via formContext
  // enrichedFields contains backend-resolved data like _resolved_ad_units
  const formContext = React.useMemo(
    () => ({
      formData,
      updateArrayItemField,
      updateArrayField,
      enrichedFields,
    }),
    [formData, updateArrayItemField, updateArrayField, enrichedFields]
  )

  // Memoize templates object to prevent recreation
  const templates = React.useMemo(
    () => ({
      FieldTemplate,
      ObjectFieldTemplate,
      ArrayFieldTemplate,
      ArrayFieldItemTemplate,
      BaseInputTemplate,
      DescriptionFieldTemplate,
    }),
    []
  )

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
        fields={customFields}
        templates={templates}
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

// Re-export types for consumers
export type { RJSFParameterFormProps } from "./types"
