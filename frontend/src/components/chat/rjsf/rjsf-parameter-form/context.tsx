import { createContext, useContext } from "react"
import type { ArrayFieldContextValue } from "./types"

/**
 * Context to pass array field info from ArrayFieldTemplate to ArrayFieldItemTemplate.
 * Contains the array field name and type flags for customizing item display.
 */
export const ArrayFieldContext = createContext<ArrayFieldContextValue | null>(null)

/**
 * Hook to access array field context within ArrayFieldItemTemplate.
 */
export function useArrayFieldContext() {
  return useContext(ArrayFieldContext)
}
