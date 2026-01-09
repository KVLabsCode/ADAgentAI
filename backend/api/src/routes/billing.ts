import { Hono } from "hono";
import { Polar } from "@polar-sh/sdk";
import { eq, and, gte, sql } from "drizzle-orm";

import { requireAuth } from "../middleware/auth";
import { trackSubscription } from "../lib/analytics";
import { db } from "../db";
import { chatSessions, messages } from "../db/schema";

const billing = new Hono();

// Initialize Polar client
const polar = new Polar({
  accessToken: Bun.env.POLAR_ACCESS_TOKEN || "",
});

// All billing routes require authentication
billing.use("*", requireAuth);

// ============================================================
// Routes
// ============================================================

/**
 * GET /billing/subscription - Get current subscription status
 */
billing.get("/subscription", async (c) => {
  const user = c.get("user");

  try {
    // Find customer by email in Polar
    const customers = await polar.customers.list({
      email: user.email,
      limit: 1,
    });

    const customer = customers.result.items[0];

    if (!customer) {
      return c.json({
        hasSubscription: false,
        status: "trial",
        plan: null,
      });
    }

    // Get active subscriptions for customer
    const subscriptions = await polar.subscriptions.list({
      customerId: customer.id,
      active: true,
      limit: 1,
    });

    const subscription = subscriptions.result.items[0];

    if (!subscription) {
      return c.json({
        hasSubscription: false,
        status: "trial",
        plan: null,
        customerId: customer.id,
      });
    }

    return c.json({
      hasSubscription: true,
      status: subscription.status,
      plan: {
        id: subscription.productId,
        name: subscription.product?.name,
        amount: subscription.amount,
        currency: subscription.currency,
        interval: subscription.recurringInterval,
      },
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      customerId: customer.id,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return c.json({ error: "Failed to fetch subscription status" }, 500);
  }
});

/**
 * GET /billing/usage - Get usage metrics
 */
billing.get("/usage", async (c) => {
  const user = c.get("user");

  try {
    // Get start of current month for billing period
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Count user messages this billing period
    // First get all session IDs for this user
    const userSessions = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id));

    let messageCount = 0;
    if (userSessions.length > 0) {
      const sessionIds = userSessions.map((s) => s.id);
      // Count user role messages in these sessions created this month
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            sql`${messages.sessionId} = ANY(${sessionIds})`,
            eq(messages.role, "user"),
            gte(messages.createdAt, startOfMonth)
          )
        );
      messageCount = result[0]?.count || 0;
    }

    // Check if user is admin (unlimited usage)
    const isAdmin = user.role === "admin";

    // Find Polar customer to check subscription
    const customers = await polar.customers.list({
      email: user.email,
      limit: 1,
    });

    const customer = customers.result.items[0];
    let hasActiveSubscription = false;

    if (customer) {
      const subscriptions = await polar.subscriptions.list({
        customerId: customer.id,
        active: true,
        limit: 1,
      });
      hasActiveSubscription = subscriptions.result.items.length > 0;
    }

    // Determine limits: admin = unlimited, paid = unlimited, trial = 25
    const chatLimit = isAdmin || hasActiveSubscription ? -1 : 25;
    const providerLimit = isAdmin || hasActiveSubscription ? -1 : 10;

    return c.json({
      chatMessages: messageCount,
      providerQueries: 0, // TODO: Track provider queries separately
      limit: {
        chatMessages: chatLimit,
        providerQueries: providerLimit,
      },
      isAdmin,
      resetDate: endOfMonth.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return c.json({ error: "Failed to fetch usage" }, 500);
  }
});

/**
 * POST /billing/checkout - Create Polar checkout session
 */
billing.post("/checkout", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ priceId?: string; theme?: "light" | "dark" }>();

  try {
    // Use default price if not specified
    const priceId = body.priceId || Bun.env.POLAR_DEFAULT_PRICE_ID;

    if (!priceId) {
      return c.json({ error: "Price ID required" }, 400);
    }

    const checkout = await polar.checkouts.create({
      products: [priceId],
      successUrl: `${Bun.env.FRONTEND_URL}/billing?success=true`,
      customerEmail: user.email,
      customerName: user.name || undefined,
      metadata: {
        userId: user.id,
      },
    });

    // Track checkout started
    trackSubscription(user.id, "checkout_started");

    // Append theme parameter to checkout URL if provided
    let checkoutUrl = checkout.url;
    if (body.theme && checkoutUrl) {
      const separator = checkoutUrl.includes("?") ? "&" : "?";
      checkoutUrl = `${checkoutUrl}${separator}theme=${body.theme}`;
    }

    return c.json({
      checkoutUrl,
      clientSecret: checkout.clientSecret,
    });
  } catch (error) {
    console.error("Error creating checkout:", error);
    return c.json({ error: "Failed to create checkout session" }, 500);
  }
});

/**
 * POST /billing/portal - Get customer portal URL
 */
billing.post("/portal", async (c) => {
  const user = c.get("user");

  try {
    // Find customer
    const customers = await polar.customers.list({
      email: user.email,
      limit: 1,
    });

    const customer = customers.result.items[0];

    if (!customer) {
      return c.json({ error: "No billing account found" }, 404);
    }

    const session = await polar.customerSessions.create({
      customerId: customer.id,
    });

    return c.json({
      portalUrl: session.customerPortalUrl,
    });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return c.json({ error: "Failed to create portal session" }, 500);
  }
});

/**
 * GET /billing/invoices - List past invoices
 */
billing.get("/invoices", async (c) => {
  const user = c.get("user");

  try {
    // Find customer
    const customers = await polar.customers.list({
      email: user.email,
      limit: 1,
    });

    const customer = customers.result.items[0];

    if (!customer) {
      return c.json({ invoices: [] });
    }

    const orders = await polar.orders.list({
      customerId: customer.id,
      limit: 20,
    });

    return c.json({
      invoices: orders.result.items.map((order) => ({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.billingReason,
        createdAt: order.createdAt,
        product: order.product?.name,
      })),
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return c.json({ error: "Failed to fetch invoices" }, 500);
  }
});

export default billing;
