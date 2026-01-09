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
  selectedOrgRole: string | null // user's role in the selected org
  organizations: Organization[]
  selectOrganization: (orgId: string | null) => void
  createOrganization: (name: string) => Promise<Organization | null>
  isLoadingOrgs: boolean
}

const UserContext = createContext<UserContextValue | null>(null)

// Type for Neon Auth organization response (used in type assertions below)
interface _NeonAuthOrg {
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

  // Use Neon Auth's built-in organization hooks
  // useListOrganizations returns basic org info
  // useActiveOrganization returns the active org with user's membership/role
  const { data: orgList, isPending: isLoadingOrgs, refetch: refetchOrgs } = authClient.useListOrganizations()
  const { data: activeOrgData } = authClient.useActiveOrganization()

  // Get user from Neon Auth session
  const neonUser = session?.user

  // Map to our User type
  // neonUser.role comes from Neon Auth - can be set in Neon Console
  const neonUserAny = neonUser as Record<string, unknown> | undefined
  const userRole = neonUserAny?.role === 'admin' ? 'admin' : 'user'

  const user: User | null = neonUser ? {
    id: neonUser.id,
    email: neonUser.email || '',
    name: neonUser.name || neonUser.email?.split('@')[0] || 'User',
    avatar: neonUser.image || '',
    role: userRole,
  } : null

  // Get user's role from active organization data
  // activeOrgData contains: { id, name, slug, logo, createdAt, members: [...] }
  // where members includes the current user's membership with role
  const activeOrgRole = React.useMemo(() => {
    if (!activeOrgData || !neonUser) return null

    // The active org data may have members array or activeMember
    const data = activeOrgData as Record<string, unknown>

    // Try activeMember first (direct membership info from Neon Auth)
    if (data.activeMember && typeof data.activeMember === 'object') {
      const member = data.activeMember as { role?: string }
      if (member.role) {
        return member.role.toLowerCase() // Normalize to lowercase
      }
    }

    // Try members array
    if (Array.isArray(data.members)) {
      const membership = data.members.find((m: { userId?: string }) => m.userId === neonUser.id)
      const role = (membership as { role?: string })?.role
      if (role) {
        return role.toLowerCase() // Normalize to lowercase
      }
    }

    // Try role field directly on data (some Neon Auth versions return it here)
    if (typeof data.role === 'string') {
      return data.role.toLowerCase()
    }

    // Try membership field (alternative Neon Auth structure)
    if (data.membership && typeof data.membership === 'object') {
      const membership = data.membership as { role?: string }
      if (membership.role) {
        return membership.role.toLowerCase()
      }
    }

    return null
  }, [activeOrgData, neonUser])

  // Debug logging for active org data
  React.useEffect(() => {
    if (activeOrgData) {
      console.log('[UserContext] Active org data:', JSON.stringify(activeOrgData, null, 2))
    }
  }, [activeOrgData])

  // Map organizations from Neon Auth hook
  // Include role for the active organization
  const organizations: Organization[] = (orgList || []).map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo ?? null,
    createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : String(org.createdAt),
    // Add role if this is the active organization
    role: activeOrgData && (activeOrgData as { id?: string }).id === org.id ? activeOrgRole ?? undefined : undefined,
  }))

  // Find selected organization from list
  const selectedOrganization = selectedOrgId
    ? organizations.find(org => org.id === selectedOrgId) || null
    : null

  const signOut = useCallback(async () => {
    // Clear local storage
    localStorage.removeItem(ORG_STORAGE_KEY)

    // Clear all auth-related cookies (Neon Auth / Better Auth uses these)
    const cookiesToClear = [
      'better-auth.session_token',
      'better-auth.session',
      '__Secure-better-auth.session_token',
      '__Host-better-auth.session_token',
      'neon-auth.session_token',
      'neon-auth.session',
    ]
    cookiesToClear.forEach(name => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
    })

    try {
      // Sign out from Neon Auth with callback on success
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            // Hard redirect after successful sign out
            window.location.href = '/'
          },
          onError: () => {
            // Still redirect on error - user wants to sign out
            window.location.href = '/'
          }
        }
      })
    } catch (error) {
      console.error('Sign out error:', error)
      // Force redirect even on exception
      window.location.href = '/'
    }
  }, [])

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
      if (response.error) {
        console.error('Failed to create organization:', response.error)
        return null
      }
      if (response.data) {
        const org = response.data
        // Refetch organizations list to include the new org
        await refetchOrgs()
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo: org.logo ?? null,
          createdAt: typeof org.createdAt === 'string' ? org.createdAt : org.createdAt.toISOString(),
        }
      }
      return null
    } catch (error) {
      console.error('Failed to create organization:', error)
      return null
    }
  }, [neonUser, refetchOrgs])

  // Platform admin check - uses role from Neon Auth (set in Neon Console)
  const isAdmin = user?.role === 'admin'

  const value: UserContextValue = {
    user,
    isAdmin,
    isLoading: isPending,
    isAuthenticated: !!neonUser,
    signOut,
    refetch,
    getAccessToken,
    selectedOrganization,
    selectedOrganizationId: selectedOrgId,
    selectedOrgRole: activeOrgRole,
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
