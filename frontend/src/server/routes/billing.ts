import { Hono } from "hono";
import { Polar } from "@polar-sh/sdk";
import { eq, and, gte, sql } from "drizzle-orm";

import { requireAuth } from "../middleware/auth";
import { trackSubscription } from "../lib/analytics";
import { db } from "../db";
import { runSummaries } from "../db/schema";

const billing = new Hono();

// Initialize Polar client
const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || "",
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

    // Get token usage from run_summaries for this user this month
    const tokenUsageResult = await db
      .select({
        queries: sql<number>`count(*)::int`,
        toolCalls: sql<number>`COALESCE(SUM(tool_calls), 0)::int`,
        totalTokens: sql<number>`COALESCE(SUM(total_tokens), 0)::int`,
        totalCost: sql<number>`COALESCE(SUM(total_cost), 0)`,
      })
      .from(runSummaries)
      .where(
        and(
          eq(runSummaries.userId, user.id),
          gte(runSummaries.createdAt, startOfMonth)
        )
      );

    const tokenUsage = tokenUsageResult[0] || { queries: 0, toolCalls: 0, totalTokens: 0, totalCost: 0 };

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

    // Determine limits: admin = unlimited, paid = unlimited, trial = limited
    const isPro = isAdmin || hasActiveSubscription;
    const queryLimit = isPro ? -1 : 100;        // Free tier: 100 queries/month
    const tokenLimit = isPro ? -1 : 500000;     // Free tier: 500K tokens/month

    return c.json({
      // Current usage
      queries: tokenUsage.queries,              // Number of user messages
      toolCalls: tokenUsage.toolCalls,          // Number of MCP tools executed
      tokens: tokenUsage.totalTokens,           // Total tokens used
      cost: Number(tokenUsage.totalCost) || 0,  // Estimated cost in USD
      // Limits (-1 = unlimited)
      limits: {
        queries: queryLimit,
        tokens: tokenLimit,
      },
      // Plan info
      isPro,
      isAdmin,
      // Billing period
      periodStart: startOfMonth.toISOString(),
      periodEnd: endOfMonth.toISOString(),
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
    const priceId = body.priceId || process.env.POLAR_DEFAULT_PRICE_ID;

    if (!priceId) {
      return c.json({ error: "Price ID required" }, 400);
    }

    const checkout = await polar.checkouts.create({
      products: [priceId],
      successUrl: `${process.env.FRONTEND_URL}/billing?success=true`,
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
        amount: order.totalAmount,
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
