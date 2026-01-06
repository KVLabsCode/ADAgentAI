import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  // Fix for mobile browsers (Chrome on iOS/iPad) where redirects aren't handled properly
  // See: https://github.com/better-auth/better-auth/issues/1160
  fetchOptions: {
    credentials: "include" as RequestCredentials,
    onSuccess(context) {
      // Manually handle redirects that browsers don't follow automatically
      // This is critical for mobile Chrome where OAuth redirects can fail
      if (context.response.redirected) {
        window.location.href = context.response.url
      }
    },
  },
})
