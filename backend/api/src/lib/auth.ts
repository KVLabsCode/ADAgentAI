import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  baseURL: Bun.env.BETTER_AUTH_URL,
  secret: Bun.env.BETTER_AUTH_SECRET,

  // Email/password disabled - Google OAuth only
  emailAndPassword: {
    enabled: false,
  },

  // Google OAuth as primary authentication
  socialProviders: {
    google: {
      clientId: Bun.env.GOOGLE_CLIENT_ID!,
      clientSecret: Bun.env.GOOGLE_CLIENT_SECRET!,
      // Request profile and email scopes
      scope: ["openid", "email", "profile"],
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Advanced cookie configuration for cross-origin auth
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: "none" as const,
      secure: true,
      httpOnly: true,
      path: "/",
    },
  },

  // User configuration
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false, // Cannot be set by user
      },
    },
  },

  // Trusted origins for CORS - includes Vercel preview URLs
  trustedOrigins: async (request) => {
    const baseOrigins = [
      Bun.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3002",
      "https://ad-agent-ai.vercel.app",
    ];

    // If request has an origin header that's a Vercel preview URL, add it dynamically
    if (request) {
      const origin = request.headers.get("origin");
      if (origin && origin.endsWith(".vercel.app") && !baseOrigins.includes(origin)) {
        baseOrigins.push(origin);
      }
    }

    return baseOrigins;
  },

  // Callbacks for custom logic
  callbacks: {
    session: async ({ session, user }: { session: Record<string, unknown>; user: Record<string, unknown> }) => {
      // Add role to session
      return {
        ...session,
        user: {
          ...(session.user as Record<string, unknown>),
          role: (user.role as string) || "user",
        },
      };
    },
  },
});

// Export types for use in routes
export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session["user"];
