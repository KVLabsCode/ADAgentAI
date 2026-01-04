"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { User } from "@/lib/types"

interface UseUserReturn {
  user: User | null
  isAdmin: boolean
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => void
  refetch: () => void
}

export function useUser(): UseUserReturn {
  const router = useRouter()
  const { data: session, isPending, refetch } = authClient.useSession()

  const rawRole = (session?.user as { role?: string })?.role
  const role: 'user' | 'admin' = rawRole === 'admin' ? 'admin' : 'user'

  const user: User | null = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name || session.user.email?.split('@')[0] || 'User',
    avatar: session.user.image || '',
    role,
  } : null

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      router.push('/')
    }
  }, [router])

  return {
    user,
    isAdmin: user?.role === 'admin',
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    signOut,
    refetch,
  }
}
