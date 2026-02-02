import type { User, Organization, Provider } from "@/lib/types"

/**
 * Mock user for demo mode
 * This user is used when demo mode is active to bypass authentication
 */
export const DEMO_USER: User = {
  id: "demo-user-id-12345",
  email: "demo@adagent.ai",
  name: "Demo User",
  avatar: "https://ui-avatars.com/api/?name=Demo+User&background=6366f1&color=fff&size=80&bold=true",
  role: "user",
}

/**
 * Mock organization for demo mode
 */
export const DEMO_ORGANIZATION: Organization = {
  id: "demo-org-id-12345",
  name: "Demo Organization",
  slug: "demo-org",
  logo: null,
  createdAt: new Date().toISOString(),
  role: "owner",
}

/**
 * Mock providers for demo mode
 * These represent connected AdMob/GAM accounts with synthetic data
 */
export const DEMO_PROVIDERS: Provider[] = [
  {
    id: "demo-admob-provider-1",
    type: "admob",
    status: "connected",
    displayName: "Demo AdMob Account",
    identifiers: {
      publisherId: "pub-1234567890123456",
    },
    isEnabled: true,
  },
  {
    id: "demo-gam-provider-1",
    type: "gam",
    status: "connected",
    displayName: "Demo Ad Manager Network",
    identifiers: {
      networkCode: "12345678",
      accountName: "Demo Publisher Network",
    },
    isEnabled: true,
  },
]

/**
 * Get the demo user object
 */
export function getDemoUser(): User {
  return DEMO_USER
}

/**
 * Get the demo organization
 */
export function getDemoOrganization(): Organization {
  return DEMO_ORGANIZATION
}

/**
 * Get demo providers
 */
export function getDemoProviders(): Provider[] {
  return DEMO_PROVIDERS
}
