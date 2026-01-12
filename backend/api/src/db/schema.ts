import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
  varchar,
  integer,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const providerTypeEnum = pgEnum("provider_type", ["admob", "gam"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published"]);
export const waitlistStatusEnum = pgEnum("waitlist_status", ["pending", "invited", "joined", "rejected"]);
export const runStatusEnum = pgEnum("run_status", ["success", "error", "cancelled"]);

// ============================================================
// User Tables (legacy - Neon Auth uses neon_auth schema instead)
// These tables are kept for data migration purposes
// ============================================================

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: text("name"),
  image: text("image"),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("users_email_idx").on(table.email),
]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
  index("sessions_token_idx").on(table.token),
]);

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("accounts_user_id_idx").on(table.userId),
]);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// Organization Tables (for app-level org management)
// ============================================================

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  metadata: text("metadata"), // JSON string for custom metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("organizations_slug_idx").on(table.slug),
]);

export const members = pgTable("members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // owner, admin, member
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("members_organization_id_idx").on(table.organizationId),
  index("members_user_id_idx").on(table.userId),
]);

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, expired
  inviterId: text("inviter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("invitations_organization_id_idx").on(table.organizationId),
  index("invitations_email_idx").on(table.email),
]);

// ============================================================
// Application Tables
// ============================================================

// Connected Ad Platform Providers (AdMob, GAM)
// Note: userId references Neon Auth users (neon_auth schema), not public.users
export const connectedProviders = pgTable("connected_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References neon_auth.users_sync.id (no FK constraint)
  organizationId: text("organization_id"), // null = personal scope (no FK to legacy orgs)
  provider: providerTypeEnum("provider").notNull(),

  // Provider-specific identifiers
  publisherId: text("publisher_id"), // AdMob Publisher ID
  networkCode: text("network_code"), // GAM Network Code
  accountName: text("account_name"), // Display name from provider

  // OAuth tokens (JWE encrypted using BETTER_AUTH_SECRET)
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),

  // Status
  isEnabled: boolean("is_enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("connected_providers_user_id_idx").on(table.userId),
  index("connected_providers_organization_id_idx").on(table.organizationId),
  index("connected_providers_provider_idx").on(table.provider),
]);

// User Provider Preferences (per-user enable/disable for org providers)
// Allows users to toggle which providers they want to use for their queries
export const userProviderPreferences = pgTable("user_provider_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References neon_auth.users_sync.id
  providerId: uuid("provider_id").notNull().references(() => connectedProviders.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_provider_prefs_user_id_idx").on(table.userId),
  index("user_provider_prefs_provider_id_idx").on(table.providerId),
]);

// Chat Sessions
// Note: userId references Neon Auth users (neon_auth schema), not public.users
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References neon_auth.users_sync.id (no FK constraint)
  organizationId: text("organization_id"), // null = personal scope (no FK to legacy orgs)
  title: text("title").default("New Chat").notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("chat_sessions_user_id_idx").on(table.userId),
  index("chat_sessions_organization_id_idx").on(table.organizationId),
  index("chat_sessions_created_at_idx").on(table.createdAt),
]);

// Chat Messages
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),

  // Agent info for assistant messages
  agentName: varchar("agent_name", { length: 100 }),

  // Metadata for tool calls, errors, etc.
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("messages_session_id_idx").on(table.sessionId),
  index("messages_created_at_idx").on(table.createdAt),
]);

// Blog Posts
export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }),
  featured: boolean("featured").default(false).notNull(),
  status: blogPostStatusEnum("status").default("draft").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("blog_posts_slug_idx").on(table.slug),
  index("blog_posts_status_published_at_idx").on(table.status, table.publishedAt),
  index("blog_posts_author_id_idx").on(table.authorId),
]);

// ============================================================
// Relations
// ============================================================

// Legacy users table relations (Better Auth - kept for migration)
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  blogPosts: many(blogPosts),
  members: many(members),
}));

// Legacy organizations table relations (kept for migration)
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(members),
  invitations: many(invitations),
}));

export const membersRelations = relations(members, ({ one }) => ({
  organization: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// Note: No user relation - userId references Neon Auth users (neon_auth schema)
export const connectedProvidersRelations = relations(connectedProviders, () => ({
  // userId is stored as plain text referencing neon_auth.users_sync
  // organizationId is stored as plain text (Neon Auth manages orgs)
}));

// Note: No user/org relations - userId and organizationId reference Neon Auth (neon_auth schema)
export const chatSessionsRelations = relations(chatSessions, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [messages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
}));

// ============================================================
// CrewAI Configuration Tables
// ============================================================

// CrewAI Agents
export const crewAgents = pgTable("crew_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  role: varchar("role", { length: 200 }).notNull(),
  goal: text("goal").notNull(),
  backstory: text("backstory").notNull(),
  service: varchar("service", { length: 50 }), // admob, admanager, general, null for orchestrators
  capability: varchar("capability", { length: 50 }), // inventory, reporting, mediation, etc.
  allowDelegation: boolean("allow_delegation").default(false).notNull(),
  maxIter: varchar("max_iter", { length: 10 }).default("15"),
  isOrchestrator: boolean("is_orchestrator").default(false).notNull(),
  coordinates: jsonb("coordinates").$type<string[]>(), // Array of agent keys this orchestrator manages
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("crew_agents_key_idx").on(table.key),
  index("crew_agents_service_idx").on(table.service),
]);

// CrewAI Tasks
export const crewTasks = pgTable("crew_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  description: text("description").notNull(),
  expectedOutput: text("expected_output").notNull(),
  agentKey: varchar("agent_key", { length: 100 }).notNull(), // References crew_agents.key
  context: jsonb("context").$type<string[]>(), // Array of task keys this task depends on
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("crew_tasks_key_idx").on(table.key),
  index("crew_tasks_agent_key_idx").on(table.agentKey),
]);

// User Preferences (ToS acceptance, settings, etc.)
// Note: userId references Neon Auth users (neon_auth schema), not public.users
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(), // References neon_auth.users_sync.id (no FK constraint)
  tosAcceptedAt: timestamp("tos_accepted_at"), // null = not accepted yet
  tosVersion: varchar("tos_version", { length: 20 }), // e.g., "1.0", "2024-01-01"
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  privacyVersion: varchar("privacy_version", { length: 20 }),
  marketingOptIn: boolean("marketing_opt_in").default(false).notNull(),
  safeMode: boolean("safe_mode").default(false).notNull(), // Read-only mode - blocks all write operations
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_preferences_user_id_idx").on(table.userId),
]);

// ============================================================
// Observability Tables
// ============================================================

// Run Summaries - Stores metrics from LangSmith runs for user-facing analytics
// This table enables billing (token tracking), usage dashboards, and debugging
export const runSummaries = pgTable("run_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References neon_auth.users_sync.id
  organizationId: text("organization_id"), // null = personal scope
  sessionId: uuid("session_id").references(() => chatSessions.id, { onDelete: "set null" }),

  // Token metrics (for billing)
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  totalTokens: integer("total_tokens").default(0).notNull(),

  // Tool metrics
  toolCalls: integer("tool_calls").default(0).notNull(),

  // Performance
  latencyMs: integer("latency_ms"),

  // Outcome
  status: runStatusEnum("status").default("success").notNull(),
  errorMessage: text("error_message"),

  // Routing info
  service: varchar("service", { length: 50 }), // admob, admanager, general
  capability: varchar("capability", { length: 50 }), // inventory, reporting, mediation, etc.

  // Model info
  model: varchar("model", { length: 100 }),

  // Cost tracking
  totalCost: doublePrecision("total_cost"),

  // LangSmith reference for debugging
  langsmithRunId: text("langsmith_run_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("run_summaries_user_id_idx").on(table.userId),
  index("run_summaries_organization_id_idx").on(table.organizationId),
  index("run_summaries_created_at_idx").on(table.createdAt),
  index("run_summaries_langsmith_run_id_idx").on(table.langsmithRunId),
]);

// System Config - Admin-configurable settings
export const systemConfig = pgTable("system_config", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull().$type<Record<string, unknown>>(),
  updatedBy: text("updated_by"), // Admin user ID
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin Audit Log - Tracks admin content access for compliance
export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: text("admin_user_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // view_conversation, view_logs, update_config, etc.
  targetUserId: text("target_user_id"),
  targetResourceId: text("target_resource_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("admin_audit_log_admin_user_id_idx").on(table.adminUserId),
  index("admin_audit_log_action_idx").on(table.action),
  index("admin_audit_log_created_at_idx").on(table.createdAt),
]);

// Waitlist
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  status: waitlistStatusEnum("status").default("pending").notNull(),
  referralCode: varchar("referral_code", { length: 20 }).unique(),
  referredBy: uuid("referred_by"),
  position: uuid("position"),
  // Survey fields
  role: varchar("role", { length: 100 }), // e.g., "Publisher", "Developer", "Marketer"
  useCase: text("use_case"), // What they want to use it for
  invitedAt: timestamp("invited_at"),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("waitlist_email_idx").on(table.email),
  index("waitlist_status_idx").on(table.status),
  index("waitlist_referral_code_idx").on(table.referralCode),
]);

// ============================================================
// Type Exports
// ============================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type ConnectedProvider = typeof connectedProviders.$inferSelect;
export type NewConnectedProvider = typeof connectedProviders.$inferInsert;
export type UserProviderPreference = typeof userProviderPreferences.$inferSelect;
export type NewUserProviderPreference = typeof userProviderPreferences.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type CrewAgent = typeof crewAgents.$inferSelect;
export type NewCrewAgent = typeof crewAgents.$inferInsert;
export type CrewTask = typeof crewTasks.$inferSelect;
export type NewCrewTask = typeof crewTasks.$inferInsert;
export type RunSummary = typeof runSummaries.$inferSelect;
export type NewRunSummary = typeof runSummaries.$inferInsert;
export type SystemConfigEntry = typeof systemConfig.$inferSelect;
export type NewSystemConfigEntry = typeof systemConfig.$inferInsert;
export type AdminAuditLogEntry = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLogEntry = typeof adminAuditLog.$inferInsert;
