import { Hono } from "hono";
import crypto from "crypto";

const webhooks = new Hono();

// ============================================================
// Polar Webhook Handler
// ============================================================

/**
 * POST /webhooks/polar - Handle Polar webhook events
 */
webhooks.post("/polar", async (c) => {
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("POLAR_WEBHOOK_SECRET not configured");
    return c.json({ error: "Webhook not configured" }, 500);
  }

  // Get raw body for signature verification
  const rawBody = await c.req.text();
  const signature = c.req.header("polar-signature");

  if (!signature) {
    return c.json({ error: "Missing signature" }, 401);
  }

  // Verify webhook signature
  const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

  if (!isValid) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  // Parse event
  const event = JSON.parse(rawBody) as {
    type: string;
    data: Record<string, unknown>;
  };

  console.log(`Received Polar webhook: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.created":
      case "checkout.updated":
        await handleCheckoutEvent(event);
        break;

      case "subscription.created":
      case "subscription.updated":
        await handleSubscriptionEvent(event);
        break;

      case "subscription.canceled":
        await handleSubscriptionCanceled(event);
        break;

      case "order.created":
        await handleOrderCreated(event);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

// ============================================================
// Event Handlers
// ============================================================

async function handleCheckoutEvent(event: {
  type: string;
  data: Record<string, unknown>;
}) {
  const checkout = event.data as {
    id: string;
    status: string;
    customerEmail?: string;
    metadata?: Record<string, unknown>;
  };

  console.log(`Checkout ${checkout.id} status: ${checkout.status}`);

  // Track checkout progress for analytics
  if (checkout.status === "succeeded") {
    // User completed payment
    const userId = checkout.metadata?.userId;
    if (userId) {
      // Update user's subscription status in database
      // await updateUserSubscription(userId as string);
    }
  }
}

async function handleSubscriptionEvent(event: {
  type: string;
  data: Record<string, unknown>;
}) {
  const subscription = event.data as {
    id: string;
    status: string;
    customerId: string;
    productId: string;
    currentPeriodEnd: string;
  };

  console.log(
    `Subscription ${subscription.id} status: ${subscription.status}`
  );

  // Update user's subscription status based on the event
  // In production, find user by customerId and update their plan
}

async function handleSubscriptionCanceled(event: {
  type: string;
  data: Record<string, unknown>;
}) {
  const subscription = event.data as {
    id: string;
    customerId: string;
    canceledAt: string;
  };

  console.log(`Subscription ${subscription.id} canceled`);

  // Handle subscription cancellation
  // User may still have access until period end
}

async function handleOrderCreated(event: {
  type: string;
  data: Record<string, unknown>;
}) {
  const order = event.data as {
    id: string;
    amount: number;
    currency: string;
    customerId: string;
  };

  console.log(`Order ${order.id} created: ${order.amount} ${order.currency}`);

  // Track revenue, send receipt email, etc.
}

// ============================================================
// Helpers
// ============================================================

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const [timestamp, hash] = signature.split(",").map((part) => {
    const [, value] = part.split("=");
    return value;
  });

  if (!timestamp || !hash) {
    return false;
  }

  // Verify timestamp is within 5 minutes
  const signatureTime = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - signatureTime) > 300) {
    return false;
  }

  // Verify HMAC signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedHash)
  );
}

export default webhooks;
