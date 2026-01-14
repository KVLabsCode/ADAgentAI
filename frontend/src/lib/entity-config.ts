/**
 * Entity Relationship Configuration
 *
 * Single source of truth for entity relationships and dependencies.
 * Widgets auto-consult this config to determine cascading dependencies
 * without requiring per-tool hardcoding.
 *
 * Benefits:
 * - Add new entity = add one line to config
 * - No per-tool uiSchema changes needed
 * - Schema can still override with explicit `dependsOn` for edge cases
 */

export interface EntityConfig {
  /** Parent entity type (null for root entities) */
  parent: string | null
  /** Field name to use for display (e.g., "name", "displayName") */
  displayField: string
  /** Optional regex pattern to validate IDs */
  idPattern?: RegExp
  /** Description shown in UI */
  description?: string
}

export type EntityType = keyof typeof ENTITY_RELATIONSHIPS

/**
 * Entity relationships map
 * Key = fetchType used in uiSchema (e.g., "accounts", "apps", "ad_units")
 */
export const ENTITY_RELATIONSHIPS = {
  // Root entities (no parent dependency)
  accounts: {
    parent: null,
    displayField: "name",
    idPattern: /^pub-/,
    description: "AdMob publisher accounts",
  },
  networks: {
    parent: null,
    displayField: "displayName",
    idPattern: /^\d+$/,
    description: "Ad Manager network codes",
  },

  // Dependent entities (require parent selection first)
  apps: {
    parent: "accounts",
    displayField: "name",
    idPattern: /^ca-app-pub-/,
    description: "Mobile apps in AdMob",
  },
  ad_units: {
    parent: "accounts",
    displayField: "displayName",
    idPattern: /^ca-app-pub-.*\/\d+$/,
    description: "Ad units in AdMob",
  },
  ad_sources: {
    parent: "accounts",
    displayField: "name",
    description: "Ad sources for mediation",
  },
  mediation_groups: {
    parent: "accounts",
    displayField: "displayName",
    description: "Mediation groups in AdMob",
  },

  // Ad Manager specific entities
  ad_manager_ad_units: {
    parent: "networks",
    displayField: "name",
    description: "Ad units in Ad Manager",
  },
  placements: {
    parent: "networks",
    displayField: "name",
    description: "Placements in Ad Manager",
  },
  teams: {
    parent: "networks",
    displayField: "name",
    description: "Teams in Ad Manager",
  },
  contacts: {
    parent: "networks",
    displayField: "name",
    description: "Contacts in Ad Manager",
  },
} as const satisfies Record<string, EntityConfig>

/**
 * Get the parent field name for a given entity type
 *
 * @example
 * getParentField("ad_units") // returns "account_id"
 * getParentField("accounts") // returns null (root entity)
 * getParentField("placements") // returns "network_code"
 */
export function getParentField(fetchType: string): string | null {
  const config = ENTITY_RELATIONSHIPS[fetchType as EntityType]
  if (!config?.parent) return null

  // Convert parent entity type to field name
  // "accounts" → "account_id", "networks" → "network_code"
  const parentType = config.parent
  if (parentType === "accounts") return "account_id"
  if (parentType === "networks") return "network_code"

  // Fallback: singularize and add _id
  return `${parentType.replace(/s$/, "")}_id`
}

/**
 * Get the display field for a given entity type
 */
export function getDisplayField(fetchType: string): string {
  const config = ENTITY_RELATIONSHIPS[fetchType as EntityType]
  return config?.displayField ?? "name"
}

/**
 * Check if an entity type is a root entity (no parent)
 */
export function isRootEntity(fetchType: string): boolean {
  const config = ENTITY_RELATIONSHIPS[fetchType as EntityType]
  return config?.parent === null
}

/**
 * Get all entity types that depend on a given parent type
 */
export function getDependentEntities(parentType: string): EntityType[] {
  return Object.entries(ENTITY_RELATIONSHIPS)
    .filter(([, config]) => config.parent === parentType)
    .map(([key]) => key as EntityType)
}

/**
 * Validate an ID against the expected pattern for an entity type
 */
export function validateEntityId(fetchType: string, id: string): boolean {
  const config = ENTITY_RELATIONSHIPS[fetchType as EntityType]
  if (!config?.idPattern) return true
  return config.idPattern.test(id)
}

/**
 * Friendly display names for common parameter fields
 * Maps snake_case param names to human-readable labels
 */
export const PARAM_DISPLAY_NAMES: Record<string, string> = {
  // Entity IDs
  account_id: "Account",
  app_id: "App",
  ad_unit_id: "Ad Unit",
  ad_unit_ids: "Ad Units",
  network_code: "Network",
  mediation_group_id: "Mediation Group",
  ad_source_id: "Ad Source",

  // Common fields
  display_name: "Name",
  name: "Name",
  state: "Status",
  platform: "Platform",
  format: "Format",
  targeting: "Targeting",

  // Dates
  start_date: "Start Date",
  end_date: "End Date",
  date_range: "Date Range",

  // Settings
  enabled: "Enabled",
  active: "Active",
  description: "Description",
  notes: "Notes",
}

/**
 * Get friendly display name for a parameter
 * Falls back to formatted snake_case if no mapping exists
 */
export function getParamDisplayName(paramName: string): string {
  // Check explicit mapping first
  if (PARAM_DISPLAY_NAMES[paramName]) {
    return PARAM_DISPLAY_NAMES[paramName]
  }

  // Fallback: convert snake_case to Title Case
  // "some_param_name" → "Some Param Name"
  return paramName
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
