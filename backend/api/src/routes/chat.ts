import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and, count, isNull } from "drizzle-orm";

import { db } from "../db";
import { chatSessions, messages, type NewChatSession, type NewMessage } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { trackChatSession } from "../lib/analytics";
import { validateToken } from "../lib/neon-auth";

const chat = new Hono();

// Internal endpoint for Python chat server to validate tokens
// This must be before the requireAuth middleware
chat.post("/internal/validate-token", async (c) => {
  // Verify internal API key
  const apiKey = c.req.header("X-Internal-Key");
  const expectedKey = Bun.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json() as { token: string };
  const { token } = body;

  if (!token) {
    return c.json({ error: "Token required" }, 400);
  }

  const user = await validateToken(token);
  if (!user) {
    return c.json({ error: "Invalid token" }, 401);
  }

  return c.json({
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
    },
  });
});

// All other chat routes require authentication
chat.use("*", async (c, next) => {
  // Skip auth for internal endpoints
  if (c.req.path.includes("/internal/")) {
    return next();
  }
  return requireAuth(c, next);
});

// ============================================================
// Schemas
// ============================================================

const createSessionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

const saveMessageSchema = z.object({
  content: z.string().min(1).max(50000),
  role: z.enum(["user", "assistant"]),
  agentName: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const exportFormatSchema = z.object({
  format: z.enum(["json", "markdown"]).default("json"),
});

// ============================================================
// Routes
// ============================================================

/**
 * GET /chat/sessions - List user's chat history
 * When in organization context, returns org-scoped sessions
 * When in personal context, returns personal sessions (organizationId is null)
 */
chat.get("/sessions", async (c) => {
  const user = c.get("user");
  const organizationId = user.organizationId;

  // Build filter based on organization context
  const whereClause = organizationId
    ? and(
        eq(chatSessions.userId, user.id),
        eq(chatSessions.organizationId, organizationId),
        eq(chatSessions.isArchived, false)
      )
    : and(
        eq(chatSessions.userId, user.id),
        isNull(chatSessions.organizationId),
        eq(chatSessions.isArchived, false)
      );

  const sessions = await db.query.chatSessions.findMany({
    where: whereClause,
    orderBy: [desc(chatSessions.updatedAt)],
    with: {
      messages: {
        limit: 1,
        orderBy: [desc(messages.createdAt)],
      },
    },
  });

  return c.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      lastMessage: session.messages[0]?.content.slice(0, 100),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      organizationId: session.organizationId,
    })),
  });
});

/**
 * POST /chat/session - Create new chat session
 * Associates with organization if in org context
 */
chat.post(
  "/session",
  zValidator("json", createSessionSchema),
  async (c) => {
    const user = c.get("user");
    const { title } = c.req.valid("json");
    const organizationId = user.organizationId;

    const [session] = await db
      .insert(chatSessions)
      .values({
        userId: user.id,
        organizationId: organizationId, // null = personal scope, otherwise org-scoped
        title: title || "New Chat",
      } satisfies NewChatSession)
      .returning();

    return c.json({ session }, 201);
  }
);

/**
 * GET /chat/session/:id - Get single chat with messages
 */
chat.get("/session/:id", async (c) => {
  const user = c.get("user");
  const sessionId = c.req.param("id");

  const session = await db.query.chatSessions.findFirst({
    where: and(
      eq(chatSessions.id, sessionId),
      eq(chatSessions.userId, user.id)
    ),
    with: {
      messages: {
        orderBy: [messages.createdAt],
      },
    },
  });

  if (!session) {
    return c.json({ error: "Chat session not found" }, 404);
  }

  return c.json({ session });
});

/**
 * POST /chat/session/:id/message - Send message
 * This creates the user message and proxies to the agent service
 */
chat.post(
  "/session/:id/message",
  zValidator("json", sendMessageSchema),
  async (c) => {
    const user = c.get("user");
    const sessionId = c.req.param("id");
    const { content } = c.req.valid("json");

    // Verify session belongs to user
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, user.id)
      ),
    });

    if (!session) {
      return c.json({ error: "Chat session not found" }, 404);
    }

    // Create user message
    const [userMessage] = await db
      .insert(messages)
      .values({
        sessionId,
        role: "user",
        content,
      } satisfies NewMessage)
      .returning();

    // Update session timestamp
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));

    // TODO: Proxy to agent service (Flask/CrewAI)
    // For now, return a placeholder response
    // In production, this would stream the response from the agent service

    const [assistantMessage] = await db
      .insert(messages)
      .values({
        sessionId,
        role: "assistant",
        content: "Agent response placeholder - integrate with CrewAI service",
        agentName: "AdMob Assistant",
        metadata: { placeholder: true },
      } satisfies NewMessage)
      .returning();

    // Get message count for analytics
    const [{ value: messageCount }] = await db
      .select({ value: count() })
      .from(messages)
      .where(eq(messages.sessionId, sessionId));

    // Track chat activity
    trackChatSession(user.id, sessionId, messageCount);

    return c.json({
      userMessage,
      assistantMessage,
    }, 201);
  }
);

/**
 * DELETE /chat/session/:id - Delete (archive) chat
 */
chat.delete("/session/:id", async (c) => {
  const user = c.get("user");
  const sessionId = c.req.param("id");

  // Verify session belongs to user and archive it
  const [updated] = await db
    .update(chatSessions)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(
      and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, user.id)
      )
    )
    .returning();

  if (!updated) {
    return c.json({ error: "Chat session not found" }, 404);
  }

  return c.json({ success: true });
});

/**
 * POST /chat/session/:id/save-message - Save a single message
 * Used by frontend to persist messages after streaming from agent
 */
chat.post(
  "/session/:id/save-message",
  zValidator("json", saveMessageSchema),
  async (c) => {
    const user = c.get("user");
    const sessionId = c.req.param("id");
    const { content, role, agentName, metadata } = c.req.valid("json");

    // Verify session belongs to user
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, user.id)
      ),
    });

    if (!session) {
      return c.json({ error: "Chat session not found" }, 404);
    }

    // Create message
    const [message] = await db
      .insert(messages)
      .values({
        sessionId,
        role,
        content,
        agentName: agentName || null,
        metadata: metadata || null,
      } satisfies NewMessage)
      .returning();

    // Update session timestamp
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));

    return c.json({ message }, 201);
  }
);

/**
 * GET /chat/session/:id/export - Export chat
 */
chat.get(
  "/session/:id/export",
  zValidator("query", exportFormatSchema),
  async (c) => {
    const user = c.get("user");
    const sessionId = c.req.param("id");
    const { format } = c.req.valid("query");

    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, user.id)
      ),
      with: {
        messages: {
          orderBy: [messages.createdAt],
        },
      },
    });

    if (!session) {
      return c.json({ error: "Chat session not found" }, 404);
    }

    if (format === "markdown") {
      const markdown = generateMarkdown(session);
      return new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${session.title}.md"`,
        },
      });
    }

    // Default: JSON export
    return c.json({
      exportedAt: new Date().toISOString(),
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        messages: session.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          agentName: msg.agentName,
          timestamp: msg.createdAt,
        })),
      },
    });
  }
);

// ============================================================
// Helpers
// ============================================================

function generateMarkdown(session: {
  title: string;
  createdAt: Date;
  messages: Array<{
    role: string;
    content: string;
    agentName: string | null;
    createdAt: Date;
  }>;
}): string {
  const lines: string[] = [
    `# ${session.title}`,
    ``,
    `*Exported on ${new Date().toISOString()}*`,
    ``,
    `---`,
    ``,
  ];

  for (const msg of session.messages) {
    const sender = msg.role === "user" ? "You" : msg.agentName || "Assistant";
    lines.push(`## ${sender}`);
    lines.push(``);
    lines.push(msg.content);
    lines.push(``);
  }

  return lines.join("\n");
}

export default chat;
