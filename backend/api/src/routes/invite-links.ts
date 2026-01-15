import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { organizationInviteLinks } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { nanoid } from "nanoid";

const inviteLinks = new Hono();

// ============================================================
// Helpers
// ============================================================

/**
 * Check if user is an admin/owner of the organization
 */
async function isOrgAdmin(userId: string, organizationId: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT role FROM neon_auth.member
    WHERE "userId" = ${userId}
    AND "organizationId" = ${organizationId}
    LIMIT 1
  `);

  const rows = result.rows as Array<{ role: string }>;
  if (!rows || rows.length === 0) {
    return false;
  }

  const role = rows[0].role;
  return role === "owner" || role === "admin";
}

/**
 * Check if user is already a member of the organization
 */
async function isOrgMember(userId: string, organizationId: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT 1 FROM neon_auth.member
    WHERE "userId" = ${userId}
    AND "organizationId" = ${organizationId}
    LIMIT 1
  `);

  return result.rows.length > 0;
}

/**
 * Get organization details from Neon Auth
 */
async function getOrganization(organizationId: string): Promise<{ id: string; name: string; slug: string | null } | null> {
  const result = await db.execute(sql`
    SELECT id, name, slug FROM neon_auth.organization
    WHERE id = ${organizationId}
    LIMIT 1
  `);

  const rows = result.rows as Array<{ id: string; name: string; slug: string | null }>;
  return rows[0] || null;
}

/**
 * Add user as member of organization directly in Neon Auth
 */
async function addMemberToOrg(userId: string, organizationId: string, role: string): Promise<void> {
  const memberId = nanoid();
  const now = new Date();

  await db.execute(sql`
    INSERT INTO neon_auth.member (id, "organizationId", "userId", role, "createdAt")
    VALUES (${memberId}, ${organizationId}, ${userId}, ${role}, ${now})
    ON CONFLICT ("organizationId", "userId") DO NOTHING
  `);
}

// ============================================================
// Protected Routes (require auth + org context)
// ============================================================

/**
 * GET /invite-links - Get current org's active invite link
 * Requires admin role in the organization
 */
inviteLinks.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const organizationId = user.organizationId;

  if (!organizationId) {
    return c.json({ error: "Organization context required" }, 400);
  }

  // Check if user is admin
  const isAdmin = await isOrgAdmin(user.id, organizationId);
  if (!isAdmin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  try {
    const [link] = await db
      .select()
      .from(organizationInviteLinks)
      .where(
        and(
          eq(organizationInviteLinks.organizationId, organizationId),
          eq(organizationInviteLinks.isActive, true)
        )
      )
      .limit(1);

    if (!link) {
      return c.json({ link: null });
    }

    // Build full URL
    const baseUrl = Bun.env.FRONTEND_URL || "http://localhost:3000";
    const fullUrl = `${baseUrl}/join/${link.token}`;

    return c.json({
      link: {
        id: link.id,
        token: link.token,
        url: fullUrl,
        role: link.role,
        usageCount: link.usageCount,
        expiresAt: link.expiresAt?.toISOString() || null,
        createdAt: link.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[invite-links] Error fetching link:", error);
    return c.json({ error: "Failed to fetch invite link" }, 500);
  }
});

/**
 * POST /invite-links - Create or regenerate invite link
 * Deactivates any existing active link for the org
 */
const createLinkSchema = z.object({
  role: z.enum(["member", "admin"]).default("member"),
  expiresInDays: z.number().min(1).max(365).optional(),
});

inviteLinks.post("/", requireAuth, zValidator("json", createLinkSchema), async (c) => {
  const user = c.get("user");
  const organizationId = user.organizationId;
  const { role, expiresInDays } = c.req.valid("json");

  if (!organizationId) {
    return c.json({ error: "Organization context required" }, 400);
  }

  // Check if user is admin
  const isAdmin = await isOrgAdmin(user.id, organizationId);
  if (!isAdmin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  try {
    // Deactivate existing links for this org
    await db
      .update(organizationInviteLinks)
      .set({ isActive: false })
      .where(
        and(
          eq(organizationInviteLinks.organizationId, organizationId),
          eq(organizationInviteLinks.isActive, true)
        )
      );

    // Generate new token (32 chars, URL-safe)
    const token = nanoid(32);

    // Calculate expiry if specified
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create new link
    const [newLink] = await db
      .insert(organizationInviteLinks)
      .values({
        organizationId,
        token,
        role,
        createdBy: user.id,
        isActive: true,
        expiresAt,
      })
      .returning();

    const baseUrl = Bun.env.FRONTEND_URL || "http://localhost:3000";
    const fullUrl = `${baseUrl}/join/${newLink.token}`;

    console.log(`[invite-links] Created new invite link for org ${organizationId} by user ${user.id}`);

    return c.json({
      link: {
        id: newLink.id,
        token: newLink.token,
        url: fullUrl,
        role: newLink.role,
        usageCount: newLink.usageCount,
        expiresAt: newLink.expiresAt?.toISOString() || null,
        createdAt: newLink.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[invite-links] Error creating link:", error);
    return c.json({ error: "Failed to create invite link" }, 500);
  }
});

/**
 * DELETE /invite-links/:id - Deactivate an invite link
 */
inviteLinks.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const organizationId = user.organizationId;
  const linkId = c.req.param("id");

  if (!organizationId) {
    return c.json({ error: "Organization context required" }, 400);
  }

  // Check if user is admin
  const isAdmin = await isOrgAdmin(user.id, organizationId);
  if (!isAdmin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  try {
    const [link] = await db
      .select()
      .from(organizationInviteLinks)
      .where(eq(organizationInviteLinks.id, linkId))
      .limit(1);

    if (!link) {
      return c.json({ error: "Invite link not found" }, 404);
    }

    if (link.organizationId !== organizationId) {
      return c.json({ error: "Access denied" }, 403);
    }

    await db
      .update(organizationInviteLinks)
      .set({ isActive: false })
      .where(eq(organizationInviteLinks.id, linkId));

    console.log(`[invite-links] Deactivated link ${linkId} for org ${organizationId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("[invite-links] Error deactivating link:", error);
    return c.json({ error: "Failed to deactivate invite link" }, 500);
  }
});

// ============================================================
// Public Routes (for joining via link)
// ============================================================

/**
 * GET /invite-links/:token/info - Get invite link details (public)
 * Used by join page to show org info before joining
 */
inviteLinks.get("/:token/info", async (c) => {
  const token = c.req.param("token");

  try {
    const [link] = await db
      .select()
      .from(organizationInviteLinks)
      .where(eq(organizationInviteLinks.token, token))
      .limit(1);

    if (!link) {
      return c.json({ error: "Invalid invite link" }, 404);
    }

    if (!link.isActive) {
      return c.json({ error: "This invite link has been deactivated" }, 410);
    }

    // Check expiry
    if (link.expiresAt && link.expiresAt < new Date()) {
      return c.json({ error: "This invite link has expired" }, 410);
    }

    // Get organization details
    const org = await getOrganization(link.organizationId);
    if (!org) {
      return c.json({ error: "Organization not found" }, 404);
    }

    return c.json({
      valid: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      role: link.role,
    });
  } catch (error) {
    console.error("[invite-links] Error fetching link info:", error);
    return c.json({ error: "Failed to fetch invite link info" }, 500);
  }
});

/**
 * POST /invite-links/:token/join - Join organization via invite link
 * Requires authentication (user must be signed in)
 */
inviteLinks.post("/:token/join", requireAuth, async (c) => {
  const user = c.get("user");
  const token = c.req.param("token");

  try {
    const [link] = await db
      .select()
      .from(organizationInviteLinks)
      .where(eq(organizationInviteLinks.token, token))
      .limit(1);

    if (!link) {
      return c.json({ error: "Invalid invite link" }, 404);
    }

    if (!link.isActive) {
      return c.json({ error: "This invite link has been deactivated" }, 410);
    }

    // Check expiry
    if (link.expiresAt && link.expiresAt < new Date()) {
      return c.json({ error: "This invite link has expired" }, 410);
    }

    // Check if user is already a member
    const alreadyMember = await isOrgMember(user.id, link.organizationId);
    if (alreadyMember) {
      return c.json({ error: "You are already a member of this organization" }, 409);
    }

    // Get organization details
    const org = await getOrganization(link.organizationId);
    if (!org) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // Add user to organization
    await addMemberToOrg(user.id, link.organizationId, link.role);

    // Increment usage count
    await db
      .update(organizationInviteLinks)
      .set({ usageCount: sql`${organizationInviteLinks.usageCount} + 1` })
      .where(eq(organizationInviteLinks.id, link.id));

    console.log(`[invite-links] User ${user.id} joined org ${link.organizationId} as ${link.role} via link ${link.id}`);

    return c.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      role: link.role,
    });
  } catch (error) {
    console.error("[invite-links] Error joining via link:", error);
    return c.json({ error: "Failed to join organization" }, 500);
  }
});

export default inviteLinks;
