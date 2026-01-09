import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db";
import { waitlist } from "../db/schema";
import { eq, desc, count } from "drizzle-orm";
import { sendEmail, waitlistConfirmationEmail, waitlistInviteEmail } from "../lib/email";
import { nanoid } from "nanoid";

const app = new Hono();

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
