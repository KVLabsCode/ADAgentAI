import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { waitlist } from "../db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { sendEmail, waitlistConfirmationEmail, waitlistInviteEmail } from "../lib/email";
import { nanoid } from "nanoid";

const app = new Hono();

// OAuth state storage (in production, use Redis or DB)
const oauthStates = new Map<string, { createdAt: number }>();

// Clean up expired states (older than 10 minutes)
function cleanupOauthStates() {
  const now = Date.now();
  for (const [state, data] of oauthStates) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      oauthStates.delete(state);
    }
  }
}

// Generate a unique referral code
function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

// =============================================================================
// Public Routes
// =============================================================================

// Join waitlist
const joinSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1).max(100).optional(),
  referralCode: z.string().optional(),
  // Survey fields
  role: z.string().max(100).optional(),
  useCase: z.string().max(500).optional(),
});

app.post("/join", zValidator("json", joinSchema), async (c) => {
  const { email, name, referralCode, role, useCase } = c.req.valid("json");

  try {
    // Check if already on waitlist
    const existing = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      // Allow rejected users to rejoin by resetting their status
      if (existing[0].status === "rejected") {
        // Reset the entry to pending
        const [updatedEntry] = await db
          .update(waitlist)
          .set({
            status: "pending",
            name: name || existing[0].name,
            role: role || existing[0].role,
            useCase: useCase || existing[0].useCase,
          })
          .where(eq(waitlist.id, existing[0].id))
          .returning();

        // Get position
        const [{ value: position }] = await db
          .select({ value: count() })
          .from(waitlist)
          .where(eq(waitlist.status, "pending"));

        // Send confirmation email
        const emailTemplate = waitlistConfirmationEmail(name || updatedEntry.name || undefined);
        await sendEmail({
          to: email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        return c.json({
          success: true,
          message: "Welcome back! You're on the waitlist again.",
          position: Number(position),
          referralCode: updatedEntry.referralCode,
        });
      }

      // Already on waitlist with pending/invited/joined status
      return c.json(
        {
          success: false,
          error: "This email is already on the waitlist",
          status: existing[0].status,
        },
        400
      );
    }

    // Find referrer if referral code provided
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await db
        .select()
        .from(waitlist)
        .where(eq(waitlist.referralCode, referralCode.toUpperCase()))
        .limit(1);

      if (referrer.length > 0) {
        referrerId = referrer[0].id;
      }
    }

    // Create waitlist entry
    const [entry] = await db
      .insert(waitlist)
      .values({
        email: email.toLowerCase(),
        name: name || null,
        referralCode: generateReferralCode(),
        referredBy: referrerId,
        role: role || null,
        useCase: useCase || null,
      })
      .returning();

    // Get position (count of entries before this one)
    const [{ value: position }] = await db
      .select({ value: count() })
      .from(waitlist);

    // Send confirmation email
    const emailTemplate = waitlistConfirmationEmail(name);
    await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return c.json({
      success: true,
      message: "You're on the waitlist!",
      position: Number(position),
      referralCode: entry.referralCode,
    });
  } catch (error) {
    console.error("[Waitlist] Error joining:", error);
    return c.json(
      { success: false, error: "Failed to join waitlist" },
      500
    );
  }
});

// Check if user has access (invited or joined)
// Also marks user as "joined" if they were "invited" (first access)
app.get("/access/:email", async (c) => {
  const email = c.req.param("email");

  try {
    const [entry] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email.toLowerCase()))
      .limit(1);

    // Not on waitlist = no access
    if (!entry) {
      return c.json({ hasAccess: false, reason: "not_on_waitlist" });
    }

    // Check status
    if (entry.status === "invited") {
      // First time access - mark as joined
      await db
        .update(waitlist)
        .set({ status: "joined", joinedAt: new Date() })
        .where(eq(waitlist.id, entry.id));

      return c.json({ hasAccess: true, status: "joined" });
    }

    if (entry.status === "joined") {
      return c.json({ hasAccess: true, status: "joined" });
    }

    // pending or rejected = no access
    return c.json({
      hasAccess: false,
      reason: entry.status === "pending" ? "pending_approval" : "rejected",
      status: entry.status
    });
  } catch (error) {
    console.error("[Waitlist] Error checking access:", error);
    return c.json({ error: "Failed to check access" }, 500);
  }
});

// Check waitlist status by email
app.get("/status/:email", async (c) => {
  const email = c.req.param("email");

  try {
    const [entry] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email.toLowerCase()))
      .limit(1);

    if (!entry) {
      return c.json({ found: false }, 404);
    }

    // Get position
    const entriesBefore = await db
      .select({ value: count() })
      .from(waitlist)
      .where(eq(waitlist.status, "pending"));

    return c.json({
      found: true,
      status: entry.status,
      position: entry.status === "pending" ? Number(entriesBefore[0].value) : null,
      referralCode: entry.referralCode,
      joinedAt: entry.createdAt,
    });
  } catch (error) {
    console.error("[Waitlist] Error checking status:", error);
    return c.json({ error: "Failed to check status" }, 500);
  }
});

// Get waitlist stats (public)
app.get("/stats", async (c) => {
  try {
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(waitlist);

    return c.json({
      total: Number(total),
    });
  } catch (error) {
    console.error("[Waitlist] Error getting stats:", error);
    return c.json({ error: "Failed to get stats" }, 500);
  }
});

// =============================================================================
// OAuth Routes (for Google-first waitlist flow)
// =============================================================================

// Initialize OAuth flow for popup
// Returns the OAuth URL to open in a popup
app.post("/oauth/init", async (c) => {
  cleanupOauthStates();

  const clientId = Bun.env.GOOGLE_CLIENT_ID;
  const apiUrl = Bun.env.API_URL || "http://localhost:3001";

  if (!clientId) {
    return c.json({ error: "OAuth not configured" }, 500);
  }

  // Generate state for CSRF protection
  const state = nanoid(32);
  oauthStates.set(state, { createdAt: Date.now() });

  // Build OAuth URL
  const redirectUri = `${apiUrl}/api/waitlist/oauth/callback`;
  const scope = "email profile";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
    access_type: "online",
    prompt: "select_account", // Always show account picker
  });

  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return c.json({ url: oauthUrl, state });
});

// OAuth callback - exchanges code for email and redirects to frontend
app.get("/oauth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const frontendUrl = Bun.env.FRONTEND_URL || "http://localhost:3000";

  // Helper to redirect to frontend callback page
  const redirectToFrontend = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    return c.redirect(`${frontendUrl}/auth/waitlist-callback?${searchParams.toString()}`);
  };

  // Handle errors
  if (error) {
    return redirectToFrontend({ success: "false", error: "Authentication cancelled" });
  }

  if (!code || !state) {
    return redirectToFrontend({ success: "false", error: "Invalid callback parameters" });
  }

  // Verify state
  if (!oauthStates.has(state)) {
    return redirectToFrontend({ success: "false", error: "Invalid or expired state" });
  }
  oauthStates.delete(state);

  try {
    const clientId = Bun.env.GOOGLE_CLIENT_ID;
    const clientSecret = Bun.env.GOOGLE_CLIENT_SECRET;
    const apiUrl = Bun.env.API_URL || "http://localhost:3001";
    const redirectUri = `${apiUrl}/api/waitlist/oauth/callback`;

    if (!clientId || !clientSecret) {
      return redirectToFrontend({ success: "false", error: "OAuth not configured" });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("[Waitlist OAuth] Token exchange failed:", await tokenResponse.text());
      return redirectToFrontend({ success: "false", error: "Failed to authenticate" });
    }

    const tokens = await tokenResponse.json() as { access_token?: string };
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return redirectToFrontend({ success: "false", error: "No access token received" });
    }

    // Get user info (including picture)
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      return redirectToFrontend({ success: "false", error: "Failed to get user info" });
    }

    const userInfo = await userInfoResponse.json() as { email?: string; name?: string; picture?: string };
    const email = userInfo.email;
    const name = userInfo.name;
    const picture = userInfo.picture;

    if (!email) {
      return redirectToFrontend({ success: "false", error: "No email in Google profile" });
    }

    // Success - redirect to frontend with user data
    return redirectToFrontend({
      success: "true",
      email,
      name: name || "",
      picture: picture || "",
    });
  } catch (err) {
    console.error("[Waitlist OAuth] Callback error:", err);
    return redirectToFrontend({ success: "false", error: "Authentication failed" });
  }
});

// Check if email already exists in Neon Auth (existing user)
app.get("/check-existing/:email", async (c) => {
  const email = c.req.param("email");

  try {
    // Query Neon Auth user table
    const result = await db.execute(sql`
      SELECT id FROM neon_auth.user
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `);

    return c.json({
      exists: result.rows.length > 0,
    });
  } catch (error) {
    console.error("[Waitlist] Error checking existing user:", error);
    // If error (e.g., table doesn't exist), assume user doesn't exist
    return c.json({ exists: false });
  }
});

// =============================================================================
// Admin Routes (require admin auth)
// =============================================================================

// List all waitlist entries
app.get("/admin/list", async (c) => {
  // TODO: Add admin auth check
  const status = c.req.query("status");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  try {
    const whereClause = status
      ? eq(waitlist.status, status as "pending" | "invited" | "joined")
      : undefined;

    const entries = await db
      .select()
      .from(waitlist)
      .where(whereClause)
      .orderBy(desc(waitlist.createdAt))
      .limit(limit)
      .offset(offset);

    // Count with the same filter to get accurate totals
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(waitlist)
      .where(whereClause);

    return c.json({
      entries,
      total: Number(total),
      limit,
      offset,
    });
  } catch (error) {
    console.error("[Waitlist] Error listing:", error);
    return c.json({ error: "Failed to list waitlist" }, 500);
  }
});

// Invite a user (change status to invited and send email)
const inviteSchema = z.object({
  email: z.string().email(),
});

app.post("/admin/invite", zValidator("json", inviteSchema), async (c) => {
  // TODO: Add admin auth check
  const { email } = c.req.valid("json");

  try {
    const [entry] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email.toLowerCase()))
      .limit(1);

    if (!entry) {
      return c.json({ error: "Email not found on waitlist" }, 404);
    }

    if (entry.status !== "pending") {
      return c.json({ error: `User already ${entry.status}` }, 400);
    }

    // Update status to invited
    await db
      .update(waitlist)
      .set({ status: "invited", invitedAt: new Date() })
      .where(eq(waitlist.id, entry.id));

    // Send invite email
    const emailTemplate = waitlistInviteEmail(entry.name || undefined);
    await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return c.json({ success: true, message: "User invited" });
  } catch (error) {
    console.error("[Waitlist] Error inviting:", error);
    return c.json({ error: "Failed to invite user" }, 500);
  }
});

// Reject a user (remove from waitlist)
const rejectSchema = z.object({
  email: z.string().email(),
});

app.post("/admin/reject", zValidator("json", rejectSchema), async (c) => {
  // TODO: Add admin auth check
  const { email } = c.req.valid("json");

  try {
    const [entry] = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email.toLowerCase()))
      .limit(1);

    if (!entry) {
      return c.json({ error: "Email not found on waitlist" }, 404);
    }

    if (entry.status === "rejected") {
      return c.json({ error: "User already rejected" }, 400);
    }

    // Update status to rejected instead of deleting
    await db
      .update(waitlist)
      .set({ status: "rejected" })
      .where(eq(waitlist.id, entry.id));

    return c.json({ success: true, message: "User rejected" });
  } catch (error) {
    console.error("[Waitlist] Error rejecting:", error);
    return c.json({ error: "Failed to reject user" }, 500);
  }
});

// Bulk invite
const bulkInviteSchema = z.object({
  emails: z.array(z.string().email()),
});

app.post("/admin/invite-bulk", zValidator("json", bulkInviteSchema), async (c) => {
  // TODO: Add admin auth check
  const { emails } = c.req.valid("json");

  const results = {
    invited: [] as string[],
    failed: [] as { email: string; reason: string }[],
  };

  for (const email of emails) {
    try {
      const [entry] = await db
        .select()
        .from(waitlist)
        .where(eq(waitlist.email, email.toLowerCase()))
        .limit(1);

      if (!entry) {
        results.failed.push({ email, reason: "Not found" });
        continue;
      }

      if (entry.status !== "pending") {
        results.failed.push({ email, reason: `Already ${entry.status}` });
        continue;
      }

      await db
        .update(waitlist)
        .set({ status: "invited", invitedAt: new Date() })
        .where(eq(waitlist.id, entry.id));

      const emailTemplate = waitlistInviteEmail(entry.name || undefined);
      await sendEmail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      results.invited.push(email);
    } catch (error) {
      results.failed.push({ email, reason: "Error processing" });
    }
  }

  return c.json(results);
});

export default app;
