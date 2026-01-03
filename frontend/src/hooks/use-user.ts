"use client"

import { User } from "@/lib/types"

// Mock user data - replace with actual API call when backend is ready
// TODO: Replace with actual session/API call from Better Auth (P-70)
const MOCK_USER: User = {
  id: "user-1",
  email: "admin@adagent.dev",
  name: "Admin User",
  avatar: "",
  role: "admin", // Toggle to "user" to test non-admin view
}

export function useUser() {
  // In production, this would fetch from session/API
  // For now, return mock data
  return {
    user: MOCK_USER,
    isAdmin: MOCK_USER.role === "admin",
    isLoading: false,
  }
}
