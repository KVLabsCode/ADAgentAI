// Sequential event types for streaming
export type StreamEventItem =
  | { type: "routing"; service: string; capability: string }
  | { type: "thinking"; content: string }
  | { type: "tool"; name: string; params: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown }

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  agentName?: string
  createdAt: string
  // Sequential events for display
  events?: StreamEventItem[]
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
