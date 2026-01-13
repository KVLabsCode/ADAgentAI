/**
 * Custom RJSF widgets for tool approval forms
 */

import { AsyncSelectWidget } from "./async-select-widget"
import { RegistryWidgetsType } from "@rjsf/utils"

// Widget registry for RJSF
export const customWidgets: RegistryWidgetsType = {
  AsyncSelectWidget,
}

export { AsyncSelectWidget }
