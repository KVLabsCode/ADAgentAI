/**
 * Custom RJSF widgets for tool approval forms
 *
 * All widgets follow dark zinc theme with emerald accents.
 * Extensible registry pattern - to add a new widget:
 * 1. Create widget file (e.g., slider-widget.tsx)
 * 2. Import and add to customWidgets below
 * 3. Use in backend schema: "ui:widget": "SliderWidget"
 */

import { RegistryWidgetsType, RegistryFieldsType } from "@rjsf/utils"
import { AdSourceSelectWidget } from "./ad-source-widget"
import { AdSourceToggleField } from "./ad-source-toggle-widget"
import { CurrencyWidget } from "./currency-widget"
import { EntitySelectWidget } from "./entity-select-widget"
import { MultiSelectWidget } from "./multi-select-widget"
import { PlatformWidget } from "./platform-widget"
import { RadioWidget } from "./radio-widget"
import { RegionCodesWidget } from "./region-codes-widget"
import { SelectWidget } from "./select-widget"
import { ToggleWidget } from "./toggle-widget"

// Widget registry for RJSF (for scalar fields)
export const customWidgets: RegistryWidgetsType = {
  // Override default select widget with dark-themed version
  SelectWidget,

  // Entity widgets with caching and auto-dependencies
  EntitySelectWidget,
  MultiSelectWidget,
  AdSourceSelectWidget,

  // State and option widgets
  ToggleWidget,
  PlatformWidget,
  RadioWidget,

  // Specialized input widgets
  CurrencyWidget,
  RegionCodesWidget,
}

// Field registry for RJSF (for complex fields like arrays)
export const customFields: RegistryFieldsType = {
  AdSourceToggleField,
}

// Named exports for direct imports
export { AdSourceSelectWidget } from "./ad-source-widget"
export { AdSourceToggleField } from "./ad-source-toggle-widget"
export { CurrencyWidget } from "./currency-widget"
export { EntitySelectWidget } from "./entity-select-widget"
export { MultiSelectWidget } from "./multi-select-widget"
export { PlatformWidget } from "./platform-widget"
export { RadioWidget } from "./radio-widget"
export { RegionCodesWidget } from "./region-codes-widget"
export { SelectWidget } from "./select-widget"
export { ToggleWidget } from "./toggle-widget"
