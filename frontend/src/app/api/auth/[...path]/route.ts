import { authApiHandler } from "@neondatabase/auth/next/server"

// This creates all Neon Auth API endpoints:
// - /api/auth/sign-in
// - /api/auth/sign-up
// - /api/auth/sign-out
// - /api/auth/session
// - /api/auth/callback (OAuth)
// - etc.
export const { GET, POST } = authApiHandler()
