# Coding Conventions

**Analysis Date:** 2026-02-04

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `ChatContainer.tsx`, `UserContext.tsx`)
- Utilities/hooks: camelCase (e.g., `use-user.ts`, `chat-settings.ts`, `email.ts`)
- Routes/pages: kebab-case for URL segments, files match Next.js App Router conventions
- Test files: `filename.test.ts` or `filename.spec.ts` suffix
- E2E tests: `filename.spec.ts` in `tests/e2e/` directory

**Functions:**
- camelCase: `fetchProviders()`, `createAuthHeaders()`, `isOrgAdmin()`, `waitForChatReady()`
- Async functions: named clearly with `async` keyword (e.g., `fetchReceivedInvitations()`, `acceptTos()`)
- Helper functions: underscore prefix for internal/private helpers in some cases, or suffix with "Helper" or "Utils"
- Test functions: descriptive test names in `it()` blocks (e.g., `it("should return ok status", ...)`)

**Variables:**
- camelCase: `isLoading`, `selectedOrganizationId`, `isDemoMode`, `enabledProviderIds`
- Boolean prefixes: `is`, `has`, `should`, `can`, `show` (e.g., `isLoading`, `hasWaitlistAccess`, `canApprove`)
- Unused parameters: prefixed with underscore (e.g., `_fetchAttempted`, `_NeonAuthOrg`)
- Constants: UPPER_SNAKE_CASE (e.g., `OAUTH_CONFIG`, `SMTP_HOST`, `ORG_STORAGE_KEY`)
- Database fields: snake_case in schema, mapped to camelCase in TypeScript objects

**Types:**
- PascalCase: `User`, `Organization`, `Provider`, `Message`, `StreamEventItem`
- Interfaces: `UserContextValue`, `ApiProvider`, `SendEmailOptions`, `AppError`
- Enums: PascalCase with values as lowercase strings (e.g., `userRoleEnum = pgEnum("user_role", ["user", "admin"])`)
- Generic types: concise single letter when single generic, descriptive otherwise

## Code Style

**Formatting:**
- ESLint with Next.js and TypeScript rules enabled in frontend (`eslint.config.mjs`)
- Configured rules: `@typescript-eslint/no-unused-vars` with argsIgnorePattern `^_` and varsIgnorePattern `^_`
- No explicit prettier config; formatting enforced via ESLint
- Indentation: 2 spaces (standard Node.js/Next.js)

**Linting:**
- Frontend: `bun run lint` runs ESLint via Next.js config
- Backend API: `bun run typecheck` runs TypeScript compiler without emit
- Both use strict TypeScript with `strict: true` in tsconfig.json
- No unused variables allowed (caught at compile time)

**Import Order:**
1. External imports (React, Next.js, third-party packages)
2. Internal absolute imports (using path aliases)
3. Relative imports (types, utils, components)
4. Side effects last if needed

**Path Aliases:**
- Frontend: `@/*` → `./src/*`, `@/atoms` → `./src/components/atoms`, `@/molecules` → `./src/components/molecules`, `@/organisms` → `./src/components/organisms`, `@/templates` → `./src/components/templates`
- Backend API: `@/*` → `./src/*`
- Always use aliases for imports within the project, never relative paths for cross-directory imports

## Error Handling

**Backend (Hono + Zod):**
- Global error handler middleware in `src/middleware/error-handler.ts` catches all errors
- Zod validation errors return 400 with `VALIDATION_ERROR` code and flattened field errors
- HTTP exceptions (from Hono) return error status with `HTTP_ERROR` code
- Generic Error instances return 500 with `INTERNAL_ERROR` code (includes stack in dev mode only)
- Unknown errors return 500 with `UNKNOWN_ERROR` code
- All errors logged to console and critical errors sent to Sentry

**Frontend:**
- Try-catch blocks in async operations (e.g., `fetchProviders()`)
- Errors logged to console with context (e.g., `console.error('Failed to fetch providers:', error)`)
- User-facing errors shown via toast notifications using Sonner
- Loading states prevent race conditions (`isLoading` flags, abort controllers)

**Pattern Example (Backend):**
```typescript
// src/lib/email.ts
export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!transporter || !isSmtpConfigured) {
    console.warn("[Email] SMTP not configured...");
    return { success: false, error: "Email not configured" };
  }
  try {
    const info = await transporter.sendMail({ ... });
    console.log("[Email] Sent successfully:", info.messageId);
    return { success: true, data: { messageId: info.messageId } };
  } catch (err) {
    console.error("[Email] Error:", err);
    return { success: false, error: String(err) };
  }
}
```

**Pattern Example (Frontend):**
```typescript
// src/app/(authenticated)/chat/page.tsx
React.useEffect(() => {
  async function fetchProviders() {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await authFetch(`/api/providers`, accessToken);
      if (response.ok) {
        // Handle success
      } else if (response.status === 401) {
        console.warn('Auth error fetching providers...');
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setIsLoading(false);
    }
  }
  // ...
}, [dependencies]);
```

## Logging

**Framework:** Console logging (no dedicated logging library)

**Patterns:**
- Development info: `console.log()` with descriptive context
- Warnings: `console.warn()` for recoverable issues (e.g., "SMTP not configured")
- Errors: `console.error()` with full error object and context
- Module-prefixed logs: `[Module] Message` (e.g., `[Email] Sent successfully`)
- Request logging: via Hono middleware `logger()` for HTTP requests
- Database logging: errors only

**Observability:**
- Sentry integration via `src/lib/sentry.ts` (backend only)
- PostHog analytics via `src/lib/analytics.ts` (backend) and `posthog-js` (frontend)
- Breadcrumbs added to error handler context (method, path, query)

## Comments

**When to Comment:**
- Complex business logic that isn't self-documenting (e.g., OAuth flows, state machine logic)
- Workarounds or hacks with explanation of why (rare in this codebase)
- Section dividers for organization (e.g., `// ============================================================`)
- Inline comments for non-obvious conditional logic

**JSDoc/TSDoc:**
- Functions exported from utilities/helpers use JSDoc block comments (example: `src/lib/email.ts`)
- Test helper functions documented with JSDoc (e.g., `/** Test helper: Wait for chat ready */`)
- Complex type definitions document parameters and return types
- No @param/@returns tags for simple, obvious functions

**Pattern Example:**
```typescript
/**
 * Check if user is an admin/owner of the current organization
 * Returns true if personal context (no org) or if user is admin/owner
 */
async function isOrgAdmin(userId: string, organizationId: string | null): Promise<boolean> {
  // Personal context - user owns their own providers
  if (!organizationId) {
    return true;
  }
  // Check org membership role via Neon Auth
  // ...
}
```

## Function Design

**Size:**
- Routes/handlers: 200+ lines acceptable (complex business logic)
- Components: target <300 lines, split complex components into smaller ones
- Hooks: target <150 lines, extract reusable logic early
- Utility functions: <100 lines preferred, single responsibility

**Parameters:**
- Use object parameters for functions with 2+ parameters (destructured)
- Type parameters explicitly (e.g., `(page: Page, timeout = 30000): Promise<void>`)
- Provide sensible defaults for optional parameters

**Return Values:**
- Async functions return typed Promises
- Success/error patterns for operations that might fail (e.g., `{ success: boolean; data?: T; error?: string }`)
- Null checks preferred over throwing in non-critical paths
- Type-safe returns with explicit union types

**Pattern Example:**
```typescript
// Destructured object parameters with typing
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  // ...
  return { success: true, data: { messageId: info.messageId } };
}

// React hooks
export function useUser(): UserContextValue {
  // Complex logic extracted and reused
}
```

## Module Design

**Exports:**
- Prefer named exports over default exports (enforced by ESLint)
- Re-export pattern for hook grouping (example: `src/hooks/use-user.ts` re-exports from context)
- Type exports: `export type X = ...` for TypeScript types
- Interface exports for API contracts and component props

**Barrel Files:**
- Used for organizing related hooks: `src/hooks/chat/index.ts` re-exports `useChatApprovals`, `useChatPersistence`, etc.
- Index files re-export from subdirectories to flatten imports
- Keep barrel files minimal—just re-exports, no logic

**Pattern Example:**
```typescript
// src/hooks/use-user.ts (barrel file)
"use client"
export { useUser } from "@/contexts/user-context"

// Usage in components
import { useUser } from "@/hooks/use-user"

// Subdirectory barrel
// src/hooks/chat/index.ts
export { useChatSession } from "./useChatSession"
export { useChatPersistence } from "./useChatPersistence"
```

## Frontend-Specific Patterns

**Client/Server Components:**
- Client components: `"use client"` directive at top of file
- Hooks only in client components
- Context providers in client components
- Pages in App Router can be server components (default)

**React Hooks (React 19 + Hooks):**
- `React.useState()` for component state
- `React.useEffect()` for side effects
- `React.useCallback()` for memoized callbacks
- `React.useRef()` for mutable refs
- Custom hooks for shared logic extracted when 3+ state variables present

**Design Tokens & Styling:**
- Semantic token names: `--tokenAccentDefault`, `--tokenSuccessDefault`
- Tailwind CSS classes for layout and spacing
- CSS custom properties for colors and typography
- Generated from W3C DTCG token files via Style Dictionary

**Component Props:**
- Typed interfaces for all component props
- Optional props marked with `?` in interface
- Default prop values in function parameters or via destructuring
- Spread remaining props via `...props`

## Backend-Specific Patterns

**Hono Routing:**
- Route handlers use context parameter `c` with typed context
- Route groups in subdirectories (e.g., `src/routes/admin/`)
- Middleware applied per-route or globally
- Zod validation via `zValidator` middleware

**Database (Drizzle ORM):**
- Schema definitions in `src/db/schema.ts`
- Table definitions use `pgTable()` with typed columns
- Relationships defined via `relations()`
- Indexes explicitly defined
- Snake_case column names in database, mapped to camelCase in code

**Pattern Example:**
```typescript
// src/routes/providers.ts
const providers = new Hono();

// Middleware for auth
providers.use("*", async (c, next) => {
  const path = c.req.path;
  if (path.includes("/internal/")) return next();
  if (path.includes("/callback/")) return next();
  return requireAuth(c, next);
});

// Zod schemas
const providerTypeSchema = z.enum(["admob", "gam"]);

// Route handler
providers.post(
  "/toggle/:providerId",
  zValidator("json", toggleProviderSchema),
  async (c) => {
    // Handler implementation
  }
);
```

---

*Convention analysis: 2026-02-04*
