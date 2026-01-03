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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const providerTypeEnum = pgEnum("provider_type", ["admob", "gam"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published"]);

// ============================================================
// Better Auth Tables (required by better-auth)
// ============================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
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
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// Application Tables
// ============================================================

// Connected Ad Platform Providers (AdMob, GAM)
export const connectedProviders = pgTable("connected_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: providerTypeEnum("provider").notNull(),

  // Provider-specific identifiers
  publisherId: text("publisher_id"), // AdMob Publisher ID
  networkCode: text("network_code"), // GAM Network Code
  accountName: text("account_name"), // Display name from provider

  // OAuth tokens (encrypted in production)
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
  index("connected_providers_provider_idx").on(table.provider),
]);

// Chat Sessions
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").default("New Chat").notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("chat_sessions_user_id_idx").on(table.userId),
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
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  connectedProviders: many(connectedProviders),
  chatSessions: many(chatSessions),
  blogPosts: many(blogPosts),
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

export const connectedProvidersRelations = relations(connectedProviders, ({ one }) => ({
  user: one(users, {
    fields: [connectedProviders.userId],
    references: [users.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
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
// Type Exports
// ============================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type ConnectedProvider = typeof connectedProviders.$inferSelect;
export type NewConnectedProvider = typeof connectedProviders.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
