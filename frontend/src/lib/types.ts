// Ad source types for API-key based ad networks (mediation partners)
export type AdSourceName =
  | "applovin"
  | "unity"
  | "liftoff"
  | "inmobi"
  | "mintegral"
  | "pangle"
  | "dtexchange"

export interface AdSourceConfigField {
  key: string
  label: string
  type: "text" | "password"
  required: boolean
  placeholder?: string
  helpText?: string
  helpUrl?: string
}

export interface AdSourceConfig {
  name: AdSourceName
  displayName: string
  description?: string
  docsUrl?: string
  fields: AdSourceConfigField[]
}

export interface AdSource {
  id: string
  adSourceName: AdSourceName
  displayName: string
  isEnabled: boolean
  connectedAt: string
  providerId?: string
  // Legacy alias for backward compatibility
  networkName?: AdSourceName
}

// Legacy aliases for backward compatibility during migration
export type NetworkName = AdSourceName
export type NetworkConfigField = AdSourceConfigField
export type NetworkConfig = AdSourceConfig
export type NetworkCredential = AdSource

// Action required types (for prompting user to connect provider, etc.)
export type ActionRequiredType =
  | "connect_provider"
  | "upgrade_plan"
  | "verify_email"
  | "grant_permissions"
  | "reauthenticate"

// JSON Schema types for parameter editing
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
}

export interface JSONSchema {
  type: "object"
  properties: Record<string, SchemaProperty>
  required?: string[]
}

// RJSF UI Schema types
export interface UISchemaField {
  "ui:widget"?: string
  "ui:options"?: {
    fetchType?: "accounts" | "apps" | "ad_units" | "ad_sources" | "mediation_groups" | "networks"
    dependsOn?: string
    multiSelect?: boolean
  }
  "ui:help"?: string
  "ui:placeholder"?: string
  "ui:disabled"?: boolean
}

export interface UISchema {
  [fieldName: string]: UISchemaField
}

// RJSF-compatible schema format from backend
export interface RJSFSchema {
  schema: JSONSchema
  uiSchema: UISchema
}

// Sequential event types for streaming
export type StreamEventItem =
  | { type: "routing"; service: string; capability: string; thinking?: string; execution_path?: string; model_selected?: string }
  | { type: "thinking"; content: string; model?: string }
  | { type: "content"; content: string }  // Intermediate content (before/between tools)
  | { type: "result"; content: string; model?: string }    // Final answer (after all tools complete)
  | { type: "tool"; name: string; params: Record<string, unknown>; approved?: boolean; model?: string }
  | { type: "tool_executing"; tool_name: string; message: string }  // Tool execution started (shows spinner)
  | { type: "tool_result"; name: string; result: unknown }
  | { type: "tool_approval_required"; approval_id: string; tool_name: string; tool_input: string; parameter_schema?: RJSFSchema }
  | { type: "tool_denied"; tool_name: string; reason: string }
  | { type: "tool_cancelled"; tool_name: string; approval_id: string }
  | { type: "action_required"; action_type: ActionRequiredType; message: string; deep_link?: string; blocking: boolean; metadata?: Record<string, unknown> }
  | { type: "finished"; message?: string }

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  agentName?: string
  createdAt: string
  // Sequential events for display
  events?: StreamEventItem[]
  // Streaming state
  aborted?: boolean  // True if streaming was stopped by user
  // Legacy fields for backward compatibility with saved messages
  hasThinking?: boolean
  thinking?: string
  hasToolCalls?: boolean
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
}

export interface ToolCall {
  name: string
  params: Record<string, unknown>
}

export interface ToolResult {
  name: string
  result: unknown
}

export interface Provider {
  id: string
  type: "admob" | "gam"
  status: "connected" | "disconnected"
  displayName: string
  identifiers: {
    publisherId?: string // AdMob
    networkCode?: string // GAM
    accountName?: string // GAM
  }
  isEnabled?: boolean // Whether provider is enabled for context
}

export interface ProviderApp {
  id: string
  name: string
  platform: "IOS" | "ANDROID" | "UNKNOWN"
  appStoreId?: string
  approvalState?: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  enabledProviders: string[]
}

// OAuth account returned from provider during connection
export interface OAuthAccount {
  id: string
  type: "admob" | "gam"
  displayName: string
  identifiers: {
    publisherId?: string // AdMob
    networkCode?: string // GAM
    accountName?: string // GAM
  }
}

// Organization (Better Auth)
export interface Organization {
  id: string
  name: string
  slug: string | null
  logo: string | null
  createdAt: string
  role?: string // user's role in this org: owner, admin, member
}

// Organization member
export interface OrganizationMember {
  id: string
  userId: string
  organizationId: string
  role: string
  createdAt: string
  user?: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

// Organization invitation (sent by admin)
export interface OrganizationInvitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
}

// Shareable organization invite link
export interface OrganizationInviteLink {
  id: string
  token: string
  url: string
  role: string
  usageCount: number
  expiresAt: string | null
  createdAt: string
}

// Invitation received by current user (from another org)
export interface ReceivedInvitation {
  id: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: string
  status: "pending" | "accepted" | "rejected" | "canceled" | "expired"
  inviterEmail?: string
  expiresAt: string
  createdAt: string
}

// User with role-based access
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: "user" | "admin"
}

// Blog post for admin management
export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string | unknown[] // Support both markdown string and Portable Text array
  category: "Product" | "Company" | "Education" | "Tips"
  status: "draft" | "published"
  featured: boolean
  authorId: string
  authorName: string
  authorImage?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface BlogPostMeta {
  id: string
  slug: string
  title: string
  excerpt: string
  category: "Product" | "Company" | "Education" | "Tips"
  status: "draft" | "published"
  featured: boolean
  authorName: string
  authorImage?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}
