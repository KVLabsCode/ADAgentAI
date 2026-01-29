"use client"

import * as React from "react"
import { useCallback, useState, createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/neon-auth/client"
import { User, Organization, ReceivedInvitation } from "@/lib/types"
import { storage } from "@/lib/storage"

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
  // Waitlist access
  hasWaitlistAccess: boolean | null // null = not checked yet
  waitlistAccessReason: string | null // "not_on_waitlist", "pending_approval", "rejected"
  isCheckingWaitlist: boolean
  recheckWaitlistAccess: () => Promise<void>
  // Terms of Service
  hasAcceptedTos: boolean | null // null = not checked yet
  isCheckingTos: boolean
  acceptTos: (marketingOptIn?: boolean) => Promise<boolean>
  // Received invitations (invitations TO this user from other orgs)
  receivedInvitations: ReceivedInvitation[]
  isLoadingInvitations: boolean
  fetchReceivedInvitations: () => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<boolean>
  rejectInvitation: (invitationId: string) => Promise<boolean>
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
  return storage.get<string | null>(ORG_STORAGE_KEY, null)
}

// E2E Test Mode Detection
// When running Playwright tests, we bypass Neon Auth SDK validation
// and use the test user stored in localStorage by global.setup.ts
function isE2ETestMode(): boolean {
  return storage.get<string>('e2e-test-mode', '') === 'true'
}

function getE2ETestUser(): { id: string; email: string; name: string } | null {
  return storage.get<{ id: string; email: string; name: string } | null>('e2e-test-user', null)
}

function getE2ESessionToken(): string | null {
  return storage.get<string | null>('neon-auth.session_token', null)
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const _router = useRouter()
  const { data: session, isPending, refetch } = authClient.useSession()

  // E2E Test Mode: Check on mount if we should use test user
  const [e2eTestMode] = useState(() => isE2ETestMode())
  const [e2eTestUser] = useState(() => getE2ETestUser())

  // Initialize from localStorage synchronously to avoid cascading renders
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(getInitialOrgId)

  // Waitlist access state
  const [hasWaitlistAccess, setHasWaitlistAccess] = useState<boolean | null>(null)
  const [waitlistAccessReason, setWaitlistAccessReason] = useState<string | null>(null)
  const [isCheckingWaitlist, setIsCheckingWaitlist] = useState(false)

  // Terms of Service state
  const [hasAcceptedTos, setHasAcceptedTos] = useState<boolean | null>(null)
  const [isCheckingTos, setIsCheckingTos] = useState(false)

  // Received invitations state (invitations TO this user)
  const [receivedInvitations, setReceivedInvitations] = useState<ReceivedInvitation[]>([])
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false)

  // Use Neon Auth's built-in organization hooks
  // useListOrganizations returns basic org info
  // useActiveOrganization returns the active org with user's membership/role
  const { data: orgList, isPending: isLoadingOrgs, refetch: refetchOrgs } = authClient.useListOrganizations()
  const { data: activeOrgData } = authClient.useActiveOrganization()

  // Get user from Neon Auth session OR from E2E test mode
  const neonUser = session?.user

  // Map to our User type
  // In E2E test mode, use the test user from localStorage
  // Otherwise, use the Neon Auth session user
  const neonUserAny = neonUser as Record<string, unknown> | undefined
  const userRole = neonUserAny?.role === 'admin' ? 'admin' : 'user'

  const user: User | null = e2eTestMode && e2eTestUser
    ? {
        id: e2eTestUser.id,
        email: e2eTestUser.email,
        name: e2eTestUser.name,
        avatar: '',
        role: 'user' as const,
      }
    : neonUser ? {
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

  // Refetch organizations when user becomes authenticated
  // This ensures orgs load immediately after sign in without page refresh
  React.useEffect(() => {
    if (neonUser && !isLoadingOrgs) {
      refetchOrgs()
    }
  }, [neonUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reusable function to check waitlist access
  const recheckWaitlistAccess = useCallback(async () => {
    // E2E test mode: Bypass waitlist check - test user is already on waitlist
    if (e2eTestMode && e2eTestUser) {
      setHasWaitlistAccess(true)
      setWaitlistAccessReason(null)
      return
    }

    if (!neonUser?.email) {
      setHasWaitlistAccess(null)
      setWaitlistAccessReason(null)
      return
    }

    setIsCheckingWaitlist(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/waitlist/access/${encodeURIComponent(neonUser.email)}`)

      if (!response.ok) {
        // On error, allow access to prevent lockout
        setHasWaitlistAccess(true)
        setWaitlistAccessReason(null)
        return
      }

      const data = await response.json()

      if (data.hasAccess) {
        setHasWaitlistAccess(true)
        setWaitlistAccessReason(null)
      } else {
        setHasWaitlistAccess(false)
        setWaitlistAccessReason(data.reason || 'unknown')
      }
    } catch (error) {
      console.error('Failed to check waitlist access:', error)
      // On error, allow access to prevent lockout
      setHasWaitlistAccess(true)
      setWaitlistAccessReason(null)
    } finally {
      setIsCheckingWaitlist(false)
    }
  }, [neonUser?.email, e2eTestMode, e2eTestUser])

  // Check waitlist access when user authenticates
  React.useEffect(() => {
    recheckWaitlistAccess()
  }, [recheckWaitlistAccess])

  // Check ToS acceptance when user authenticates and has waitlist access
  React.useEffect(() => {
    async function checkTosStatus() {
      // E2E test mode: Bypass ToS check - test user has already accepted ToS
      if (e2eTestMode && e2eTestUser) {
        setHasAcceptedTos(true)
        return
      }

      if (!neonUser?.id || !hasWaitlistAccess) {
        // Don't check ToS if not authenticated or no waitlist access
        return
      }

      setIsCheckingTos(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        // Get session token for auth
        const sessionAny = session as Record<string, unknown> | undefined
        let token: string | null = null
        if (sessionAny?.session && typeof sessionAny.session === 'object') {
          const nestedSession = sessionAny.session as Record<string, unknown>
          if (nestedSession.token && typeof nestedSession.token === 'string') {
            token = nestedSession.token
          }
        } else if (sessionAny?.token && typeof sessionAny.token === 'string') {
          token = sessionAny.token
        }

        const response = await fetch(`${apiUrl}/api/account/tos-status`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        })

        if (!response.ok) {
          // On error, assume accepted to prevent blocking
          setHasAcceptedTos(true)
          return
        }

        const data = await response.json()

        setHasAcceptedTos(data.accepted === true)
      } catch (error) {
        console.error('Failed to check ToS status:', error)
        // On error, assume accepted to prevent blocking (they can be asked later)
        setHasAcceptedTos(true)
      } finally {
        setIsCheckingTos(false)
      }
    }

    checkTosStatus()
  }, [neonUser?.id, hasWaitlistAccess, session, e2eTestMode, e2eTestUser])

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
    storage.remove(ORG_STORAGE_KEY)

    // Clear all auth-related cookies (Neon Auth / Better Auth uses these)
    // Must handle both localhost (no Secure flag) and production (Secure flag)
    const cookieNames = [
      // Neon Auth cookies (production uses __Secure- prefix)
      '__Secure-neon-auth.session_token',
      '__Secure-neon-auth.session_challange',
      'neon-auth.session_token',
      'neon-auth.session_challange',
      // Better Auth cookies (fallback)
      'better-auth.session_token',
      'better-auth.session',
      '__Secure-better-auth.session_token',
      '__Host-better-auth.session_token',
    ]

    const isProduction = window.location.protocol === 'https:'
    const domain = window.location.hostname

    cookieNames.forEach(name => {
      // Clear with various combinations to ensure removal
      const expiry = 'expires=Thu, 01 Jan 1970 00:00:00 GMT'

      // Basic clear
      document.cookie = `${name}=; ${expiry}; path=/`

      // With domain
      document.cookie = `${name}=; ${expiry}; path=/; domain=${domain}`

      // With Secure flag for production
      if (isProduction) {
        document.cookie = `${name}=; ${expiry}; path=/; Secure`
        document.cookie = `${name}=; ${expiry}; path=/; domain=${domain}; Secure`
        document.cookie = `${name}=; ${expiry}; path=/; domain=.${domain}; Secure`
      }
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
  // In E2E test mode, return the token from localStorage
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // E2E test mode: Return the session token from localStorage
    if (e2eTestMode) {
      return getE2ESessionToken()
    }

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
  }, [session, e2eTestMode])

  // Select an organization (or null for personal scope)
  // Uses Neon Auth's organization.setActive() API
  const selectOrganization = useCallback(async (orgId: string | null) => {
    setSelectedOrgId(orgId)
    if (orgId) {
      storage.set(ORG_STORAGE_KEY, orgId)
      try {
        await authClient.organization.setActive({ organizationId: orgId })
      } catch (error) {
        console.error('Failed to set active organization:', error)
      }
    } else {
      storage.remove(ORG_STORAGE_KEY)
      try {
        await authClient.organization.setActive({ organizationId: null })
      } catch (error) {
        console.error('Failed to clear active organization:', error)
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

  // Accept Terms of Service
  const acceptTos = useCallback(async (marketingOptIn: boolean = false): Promise<boolean> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      // Get session token for auth
      const sessionAny = session as Record<string, unknown> | undefined
      let token: string | null = null
      if (sessionAny?.session && typeof sessionAny.session === 'object') {
        const nestedSession = sessionAny.session as Record<string, unknown>
        if (nestedSession.token && typeof nestedSession.token === 'string') {
          token = nestedSession.token
        }
      } else if (sessionAny?.token && typeof sessionAny.token === 'string') {
        token = sessionAny.token
      }

      const response = await fetch(`${apiUrl}/api/account/accept-tos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ marketingOptIn }),
      })

      if (response.ok) {
        setHasAcceptedTos(true)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to accept ToS:', error)
      return false
    }
  }, [session])

  // Fetch invitations received by the current user
  const fetchReceivedInvitations = useCallback(async () => {
    if (!neonUser) return
    setIsLoadingInvitations(true)
    try {
      const response = await authClient.organization.listUserInvitations()
      if (response.data) {
        // Response may be array or object with invitations property
        const rawList = Array.isArray(response.data)
          ? response.data
          : (response.data as { invitations?: unknown[] }).invitations || []

        // Type for raw invitation from Neon Auth
        type RawInvitation = {
          id: string
          organizationId: string
          organization?: { name?: string; slug?: string }
          organizationName?: string
          organizationSlug?: string
          role: string
          status: string
          inviterEmail?: string
          expiresAt: string | Date
          createdAt: string | Date
        }

        // Cast to typed array and filter/map
        const inviteList = rawList as RawInvitation[]
        const mapped: ReceivedInvitation[] = inviteList
          .filter((inv) => inv.status === 'pending')
          .map((inv) => ({
            id: inv.id,
            organizationId: inv.organizationId,
            organizationName: inv.organization?.name || inv.organizationName || 'Unknown Organization',
            organizationSlug: inv.organization?.slug || inv.organizationSlug || '',
            role: inv.role,
            status: inv.status as ReceivedInvitation['status'],
            inviterEmail: inv.inviterEmail,
            expiresAt: typeof inv.expiresAt === 'string' ? inv.expiresAt : inv.expiresAt.toISOString(),
            createdAt: typeof inv.createdAt === 'string' ? inv.createdAt : inv.createdAt.toISOString(),
          }))

        setReceivedInvitations(mapped)
      }
    } catch (error) {
      console.error('Failed to fetch received invitations:', error)
    } finally {
      setIsLoadingInvitations(false)
    }
  }, [neonUser])

  // Accept an invitation
  const acceptInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      await authClient.organization.acceptInvitation({ invitationId })
      // Refresh both invitations and orgs list
      await fetchReceivedInvitations()
      await refetchOrgs()
      return true
    } catch (error) {
      console.error('Failed to accept invitation:', error)
      return false
    }
  }, [fetchReceivedInvitations, refetchOrgs])

  // Reject an invitation
  const rejectInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      await authClient.organization.rejectInvitation({ invitationId })
      await fetchReceivedInvitations()
      return true
    } catch (error) {
      console.error('Failed to reject invitation:', error)
      return false
    }
  }, [fetchReceivedInvitations])

  // Fetch received invitations when user authenticates
  React.useEffect(() => {
    if (neonUser) {
      fetchReceivedInvitations()
    }
  }, [neonUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Platform admin check - uses role from Neon Auth (set in Neon Console)
  const isAdmin = user?.role === 'admin'

  // In E2E test mode, we're authenticated if we have a test user
  // Otherwise, check for Neon Auth session user
  const isAuthenticated = e2eTestMode ? !!e2eTestUser : !!neonUser

  // In E2E test mode, we're never loading (user is available immediately from localStorage)
  const isLoading = e2eTestMode ? false : isPending

  const value: UserContextValue = {
    user,
    isAdmin,
    isLoading,
    isAuthenticated,
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
    hasWaitlistAccess,
    waitlistAccessReason,
    isCheckingWaitlist,
    recheckWaitlistAccess,
    hasAcceptedTos,
    isCheckingTos,
    acceptTos,
    receivedInvitations,
    isLoadingInvitations,
    fetchReceivedInvitations,
    acceptInvitation,
    rejectInvitation,
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
