# Field Options Performance Plan

**Date:** February 3, 2026
**Status:** Planned
**Impact:** Dropdown loading time reduced from ~500ms to ~50ms

---

## Problem

The account/parent dropdown in approval forms (e.g., "Create Mediation Group") takes 200-500ms to load due to unnecessary HTTP hops and redundant data fetching.

### Current Architecture (Slow)

```
Frontend → POST /chat/field-options (Chat Server)
                ↓
         validate_user_session() → HTTP to API Server → Neon
                ↓
         get_user_providers()    → HTTP to API Server → Neon
                ↓
         Return options

Total: ~200-300ms for accounts dropdown (2 HTTP hops + 2 DB queries)
```

**Problems:**
1. Chat server has no DB access, must proxy through API server
2. Token validated twice (frontend already has valid session)
3. Two HTTP round-trips for a simple DB query
4. Providers data already fetched elsewhere but not reused

---

## Solution Overview

| Change | Impact | Effort |
|--------|--------|--------|
| Use providers from context for accounts | ~200ms → 0ms | Low |
| Move field-options to API server | -50ms per call | Medium |
| Parallel fetch on account select | -100ms total | Low |
| Server-side AdMob cache | -150ms per call | Medium |

---

## Phase 1: Use Context for Accounts (Instant Win)

### Problem
Accounts dropdown fetches data that's already loaded on app initialization.

### Solution
Share providers in UserContext, use directly in EntitySelectWidget.

### Implementation

**1. Add providers to UserContext:**

```typescript
// frontend/src/contexts/user-context.tsx

interface UserContextValue {
  // ... existing fields
  providers: Provider[]
  providersLoading: boolean
  refreshProviders: () => Promise<void>
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)

  const fetchProviders = useCallback(async () => {
    if (!isAuthenticated) return
    setProvidersLoading(true)
    try {
      const token = await getAccessToken()
      const response = await authFetch('/api/providers', token, {}, selectedOrganizationId)
      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers)
      }
    } finally {
      setProvidersLoading(false)
    }
  }, [isAuthenticated, getAccessToken, selectedOrganizationId])

  // Fetch on auth/org change
  useEffect(() => {
    if (isAuthenticated) {
      fetchProviders()
    }
  }, [isAuthenticated, selectedOrganizationId, fetchProviders])

  // ... rest of provider
}
```

**2. Update EntitySelectWidget for accounts:**

```typescript
// frontend/src/components/chat/rjsf/widgets/entity-select-widget.tsx

function EntitySelectWidget({ options, value, onChange }: Props) {
  const { fetchType, dependsOn } = options
  const { providers } = useUser()

  // Accounts: use context directly, no API call
  if (fetchType === "accounts") {
    const admobProviders = providers.filter(p => p.type === "admob")

    return (
      <Select value={value} onChange={onChange}>
        {admobProviders.map(p => (
          <SelectItem key={p.id} value={p.identifiers?.publisherId || p.identifier}>
            {p.displayName || p.name}
          </SelectItem>
        ))}
      </Select>
    )
  }

  // Other types: use existing EntityData fetch
  // ...
}
```

### Result
- Accounts dropdown: **~200ms → 0ms**
- No network request needed

---

## Phase 2: Move Field Options to API Server

### Problem
Chat server proxies through API server for all entity fetches.

### Solution
Move `/chat/field-options` to `/api/field-options` on API server.

### Implementation

**1. Create new route in API server:**

```typescript
// backend/api/src/routes/field-options.ts
import { Hono } from "hono"
import { authMiddleware } from "../middleware/auth"
import { db } from "../db"
import { connectedProviders } from "../db/schema"

export const fieldOptions = new Hono()

fieldOptions.use("/*", authMiddleware)

// Apps for a provider
fieldOptions.get("/apps", async (c) => {
  const user = c.get("user")
  const providerId = c.req.query("providerId")

  // Validate provider ownership
  const provider = await db.query.connectedProviders.findFirst({
    where: and(
      eq(connectedProviders.id, providerId),
      eq(connectedProviders.userId, user.id)
    )
  })

  if (!provider) {
    return c.json({ options: [] })
  }

  // Get valid token and fetch from AdMob
  const accessToken = await getValidAccessToken(provider)
  const apps = await fetchAdMobApps(accessToken, provider.publisherId)

  return c.json({
    options: apps.map(app => ({
      value: app.appId,
      label: app.displayName || app.appId
    }))
  })
})

// Similar for ad-units, mediation-groups, ad-sources
```

**2. Mount in API server:**

```typescript
// backend/api/src/index.ts
import { fieldOptions } from "./routes/field-options"

app.route("/api/field-options", fieldOptions)
```

**3. Update frontend API call:**

```typescript
// frontend/src/lib/api.ts
export async function fetchFieldOptions(
  fieldType: string,
  token: string | null,
  accountId?: string,
  organizationId?: string | null,
  filters?: FieldFilterParams
): Promise<{ options: FieldOption[] }> {
  // Direct to API server
  const params = new URLSearchParams({ fieldType })
  if (accountId) params.set("accountId", accountId)
  if (filters?.platform) params.set("platform", filters.platform)
  if (filters?.adFormat) params.set("adFormat", filters.adFormat)

  const response = await authFetch(
    `/api/field-options/${fieldType}?${params}`,
    token,
    {},
    organizationId
  )

  return response.json()
}
```

**4. Deprecate chat server endpoint:**

```python
# backend/chat_server.py
# Remove or mark as deprecated:
# @app.post("/chat/field-options")
```

### Result
- Removes 1 HTTP hop per request
- ~50ms savings per dropdown

---

## Phase 3: Parallel Fetching on Account Select

### Problem
When account is selected, dependent fields fetch sequentially.

### Solution
Fetch all dependent data in parallel when account changes.

### Implementation

```typescript
// frontend/src/contexts/entity-data-context.tsx

const prefetchDependentEntities = useCallback(async (
  accountId: string,
  dependentTypes: string[]
) => {
  // Fetch all in parallel
  await Promise.all(
    dependentTypes.map(type => fetchEntities(type, accountId))
  )
}, [fetchEntities])

// In EntitySelectWidget, trigger prefetch on account select
const handleAccountChange = useCallback((accountId: string) => {
  onChange(accountId)

  // Prefetch common dependent entities
  prefetchDependentEntities(accountId, [
    "apps",
    "ad_units",
    "mediation_groups",
    "bidding_ad_sources",
    "waterfall_ad_sources"
  ])
}, [onChange, prefetchDependentEntities])
```

### Result
- Dependent dropdowns load in parallel instead of on-demand
- ~100ms total savings when opening form with data

---

## Phase 4: Server-Side AdMob Cache

### Problem
Every dropdown fetch calls AdMob API (~150-300ms per call).

### Solution
Cache AdMob responses in memory or Neon with TTL.

### Implementation

**Option A: In-memory cache (simple)**

```typescript
// backend/api/src/lib/admob-cache.ts
const cache = new Map<string, { data: unknown; expires: number }>()

export async function getCachedAdMobData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000 // 5 minutes
): Promise<T> {
  const cached = cache.get(key)

  if (cached && Date.now() < cached.expires) {
    return cached.data as T
  }

  const data = await fetcher()
  cache.set(key, { data, expires: Date.now() + ttlMs })
  return data
}

// Usage in field-options
const apps = await getCachedAdMobData(
  `apps:${providerId}`,
  () => fetchAdMobApps(accessToken, publisherId)
)
```

**Option B: Neon cache (persistent, shared across instances)**

```sql
CREATE TABLE admob_cache (
  provider_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,  -- apps, ad_units, mediation_groups, ad_sources
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (provider_id, entity_type)
);

CREATE INDEX idx_admob_cache_expires ON admob_cache(expires_at);
```

```typescript
async function getCachedFromNeon<T>(
  providerId: string,
  entityType: string,
  fetcher: () => Promise<T>,
  ttlMinutes: number = 5
): Promise<T> {
  // Check cache
  const cached = await db.query.admobCache.findFirst({
    where: and(
      eq(admobCache.providerId, providerId),
      eq(admobCache.entityType, entityType),
      gt(admobCache.expiresAt, new Date())
    )
  })

  if (cached) {
    return cached.data as T
  }

  // Fetch and cache
  const data = await fetcher()
  await db.insert(admobCache)
    .values({
      providerId,
      entityType,
      data,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000)
    })
    .onConflictDoUpdate({
      target: [admobCache.providerId, admobCache.entityType],
      set: { data, fetchedAt: new Date(), expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000) }
    })

  return data
}
```

### Result
- First load: ~150-300ms (AdMob API)
- Subsequent loads: ~20ms (cache hit)

---

## Performance Summary

| Dropdown | Before | After Phase 1 | After All Phases |
|----------|--------|---------------|------------------|
| Accounts | ~200ms | **0ms** | 0ms |
| Apps | ~300ms | ~300ms | ~50ms |
| Ad Units | ~300ms | ~300ms | ~50ms |
| Ad Sources | ~300ms | ~300ms | ~50ms |
| **Total (form open)** | **~1.1s** | **~900ms** | **~150ms** |

---

## Implementation Order

1. **Phase 1** (1-2 hours) - Accounts from context
   - Immediate win, no backend changes
   - Accounts dropdown becomes instant

2. **Phase 2** (2-3 hours) - Move to API server
   - Clean architecture
   - Remove chat server proxy

3. **Phase 3** (1 hour) - Parallel prefetch
   - Simple frontend change
   - Better UX when switching accounts

4. **Phase 4** (2-3 hours) - Server-side cache
   - Biggest impact for AdMob-dependent fields
   - Choose in-memory (simple) or Neon (durable)

---

## Files to Modify

### Phase 1
- `frontend/src/contexts/user-context.tsx` - Add providers state
- `frontend/src/components/chat/rjsf/widgets/entity-select-widget.tsx` - Use context for accounts

### Phase 2
- `backend/api/src/routes/field-options.ts` - New file
- `backend/api/src/index.ts` - Mount route
- `frontend/src/lib/api.ts` - Update fetchFieldOptions
- `frontend/src/contexts/entity-data-context.tsx` - Update API URL
- `backend/chat_server.py` - Remove /chat/field-options

### Phase 3
- `frontend/src/contexts/entity-data-context.tsx` - Add prefetch function
- `frontend/src/components/chat/rjsf/widgets/entity-select-widget.tsx` - Trigger prefetch

### Phase 4
- `backend/api/src/lib/admob-cache.ts` - New cache module
- `backend/api/src/routes/field-options.ts` - Use cache
- (Optional) `backend/api/src/db/schema.ts` - Add admob_cache table

---

## Notes

- Phase 1 alone solves the "parent takes most time" issue
- All phases are independent and can be done incrementally
- No changes to approval system needed - this is purely data fetching optimization
