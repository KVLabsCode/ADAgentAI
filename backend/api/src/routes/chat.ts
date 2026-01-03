import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and, count } from "drizzle-orm";

import { db } from "../db";
import { chatSessions, messages, type NewChatSession, type NewMessage } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { trackChatSession } from "../lib/analytics";

const chat = new Hono();

// All chat routes require authentication
chat.use("*", requireAuth);

// ============================================================
// Schemas
// ============================================================

const createSessionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

const exportFormatSchema = z.object({
  format: z.enum(["json", "markdown"]).default("json"),
});

// ============================================================
// Routes
// ============================================================

/**
 * GET /chat/sessions - List user's chat history
 */
chat.get("/sessions", async (c) => {
  const user = c.get("user");

  const sessions = await db.query.chatSessions.findMany({
    where: and(
      eq(chatSessions.userId, user.id),
      eq(chatSessions.isArchived, false)
    ),
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
    })),
  });
});

/**
 * POST /chat/session - Create new chat session
 */
chat.post(
  "/session",
  zValidator("json", createSessionSchema),
  async (c) => {
    const user = c.get("user");
    const { title } = c.req.valid("json");

    const [session] = await db
      .insert(chatSessions)
      .values({
        userId: user.id,
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
