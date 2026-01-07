"use client"

import * as React from "react"
import { useCallback, useState, createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/neon-auth/client"
import { User, Organization } from "@/lib/types"

const ORG_STORAGE_KEY = "adagent_selected_org"

interface UserContextValue {
  user: User | null
  isAdmin: boolean
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => void
  refetch: () => void
  getAccessToken: () => Promise<string | null>
  selectedOrganization: Organization | null
  selectedOrganizationId: string | null
  organizations: Organization[]
  selectOrganization: (orgId: string | null) => void
  createOrganization: (name: string) => Promise<Organization | null>
  isLoadingOrgs: boolean
}

const UserContext = createContext<UserContextValue | null>(null)

// Type for Neon Auth organization response
interface NeonAuthOrg {
  id: string
  name: string
  slug: string
  logo?: string | null
  createdAt: Date
  metadata?: unknown
}

// Initialize selected org from localStorage (runs only once)
function getInitialOrgId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(ORG_STORAGE_KEY)
  }
  return null
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: session, isPending, refetch } = authClient.useSession()
  // Initialize from localStorage synchronously to avoid cascading renders
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(getInitialOrgId)

  // Use Neon Auth's built-in organization hook
  // This is part of the Organization plugin that Neon Auth includes
  const { data: orgList, isPending: isLoadingOrgs } = authClient.useListOrganizations()

  // Get user from Neon Auth session
  const neonUser = session?.user

  // Map to our User type
  const user: User | null = neonUser ? {
    id: neonUser.id,
    email: neonUser.email || '',
    name: neonUser.name || neonUser.email?.split('@')[0] || 'User',
    avatar: neonUser.image || '',
    role: 'user',
  } : null

  // Map organizations from Neon Auth hook
  const organizations: Organization[] = (orgList || []).map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo ?? null,
    createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : String(org.createdAt),
  }))

  // Find selected organization from list
  const selectedOrganization = selectedOrgId
    ? organizations.find(org => org.id === selectedOrgId) || null
    : null

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut()
      localStorage.removeItem(ORG_STORAGE_KEY)
      await new Promise(resolve => setTimeout(resolve, 100))
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/login')
    }
  }, [router])

  // Get session token for backend API calls
  // Neon Auth provides the token in the session object
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!session) {
      return null
    }

    // Extract token from Neon Auth session structure
    // The token may be in different locations depending on the session type
    const sessionAny = session as Record<string, unknown>

    // Try session.session.token (nested structure)
    if (sessionAny.session && typeof sessionAny.session === 'object') {
      const nestedSession = sessionAny.session as Record<string, unknown>
      if (nestedSession.token && typeof nestedSession.token === 'string') {
        return nestedSession.token
      }
    }

    // Try session.token (flat structure)
    if (sessionAny.token && typeof sessionAny.token === 'string') {
      return sessionAny.token
    }

    return null
  }, [session])

  // Select an organization (or null for personal scope)
  // Uses Neon Auth's organization.setActive() API
  const selectOrganization = useCallback(async (orgId: string | null) => {
    setSelectedOrgId(orgId)
    if (typeof window !== 'undefined') {
      if (orgId) {
        localStorage.setItem(ORG_STORAGE_KEY, orgId)
        try {
          await authClient.organization.setActive({ organizationId: orgId })
        } catch (error) {
          console.error('Failed to set active organization:', error)
        }
      } else {
        localStorage.removeItem(ORG_STORAGE_KEY)
        try {
          await authClient.organization.setActive({ organizationId: null })
        } catch (error) {
          console.error('Failed to clear active organization:', error)
        }
      }
    }
  }, [])

  // Create a new organization using Neon Auth's organization plugin
  const createOrganization = useCallback(async (name: string): Promise<Organization | null> => {
    if (!neonUser) return null
    try {
      const response = await authClient.organization.create({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      })
      if (response.data) {
        const org = response.data
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          createdAt: typeof org.createdAt === 'string' ? org.createdAt : org.createdAt.toISOString(),
        }
      }
      return null
    } catch (error) {
      console.error('Failed to create organization:', error)
      return null
    }
  }, [neonUser])

  const value: UserContextValue = {
    user,
    isAdmin: false,
    isLoading: isPending,
    isAuthenticated: !!neonUser,
    signOut,
    refetch,
    getAccessToken,
    selectedOrganization,
    selectedOrganizationId: selectedOrgId,
    organizations,
    selectOrganization,
    createOrganization,
    isLoadingOrgs,
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
