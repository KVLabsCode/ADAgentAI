"use client"

import { createAuthClient } from "@neondatabase/auth/next"

// Create Neon Auth client for Next.js
// For Next.js, createAuthClient reads environment variables automatically:
// - NEON_AUTH_BASE_URL (server-side)
// - NEXT_PUBLIC_NEON_AUTH_URL (client-side)
// DO NOT pass options - the function takes no arguments for Next.js
export const authClient = createAuthClient()
