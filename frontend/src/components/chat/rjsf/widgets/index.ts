/**
 * Custom RJSF widgets for tool approval forms
 *
 * All widgets follow dark zinc theme with emerald accents.
 * Extensible registry pattern - to add a new widget:
 * 1. Create widget file (e.g., slider-widget.tsx)
 * 2. Import and add to customWidgets below
 * 3. Use in backend schema: "ui:widget": "SliderWidget"
 */

import { RegistryWidgetsType } from "@rjsf/utils"
import { AsyncSelectWidget } from "./async-select-widget"
import { EntitySelectWidget } from "./entity-select-widget"
import { MultiSelectWidget } from "./multi-select-widget"
import { SelectWidget } from "./select-widget"

// Widget registry for RJSF
export const customWidgets: RegistryWidgetsType = {
  // Override default select widget with dark-themed version
  SelectWidget,

  // Legacy widget (still works, but prefer EntitySelectWidget for new usage)
  AsyncSelectWidget,

  // Enhanced widgets with caching and auto-dependencies
  EntitySelectWidget,
  MultiSelectWidget,
}

// Named exports for direct imports
export { AsyncSelectWidget } from "./async-select-widget"
export { EntitySelectWidget } from "./entity-select-widget"
export { MultiSelectWidget } from "./multi-select-widget"
export { SelectWidget } from "./select-widget"
