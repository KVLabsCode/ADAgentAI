# Codebase Concerns

**Analysis Date:** 2026-02-04

## Tech Debt

**Pydantic V1 Compatibility Issue:**
- Issue: Suppression of Pydantic V1 warning from LangChain on Python 3.14+
- Files: `backend/chat_server.py` (lines 11-16)
- Impact: Build warnings during startup, fragile dependency chain
- Fix approach: Upgrade to Pydantic>=2.13 which removes the warning. Currently pinned to 2.12.5. Add to requirements.txt update plan for next dependency refresh cycle.

**Deprecated Schema Extractor Function:**
- Issue: `get_tool_schema()` function marked DEPRECATED with note to use `get_tool_schema_by_mcp_name()` instead
- Files: `backend/chat/approval/schema_extractor.py` (line 54)
- Impact: Old code path exists, increases maintenance burden
- Fix approach: Search codebase for calls to deprecated function and migrate to new RJSF format. Can be batched into a refactoring phase.

**File-Based State Management (Fragile):**
- Issue: Streaming state uses JSON files in temp directory for cross-module communication instead of proper event bus
- Files: `backend/chat/streaming/state.py`, `backend/chat/approval/handlers.py`
- Impact: Race conditions in concurrent requests, lost state on process crash, not suitable for distributed deployments
- Fix approach: Migrate to Redis-backed state store or in-memory event bus with proper locking. This is blocking horizontal scaling.

**Print Statements in Production Code:**
- Issue: Extensive use of `print(f"[DEBUG]...")` throughout streaming processor for debugging
- Files: `backend/chat/streaming/processor.py` (26+ debug print statements)
- Impact: Verbose logs, difficult to filter signal from noise, inconsistent with logging framework
- Fix approach: Replace all debug prints with structured logging via Python logging module with DEBUG level. Use log aggregation tools to capture when needed.

**Threading Lock for State (Python GIL limitation):**
- Issue: Uses `threading.Lock()` for state synchronization in approval handlers and streaming state
- Files: `backend/chat/streaming/state.py` (line 23), `backend/chat_server.py` (line 73)
- Impact: False sense of thread safety; Python GIL means multiple processes won't be protected. File-based state doesn't scale to multi-process workers.
- Fix approach: Move to queue-based architecture or Redis-backed state when addressing distributed deployment.

## Security Considerations

**Exposed Credentials in .env File:**
- Risk: All API keys, database passwords, and secrets are committed to `.env` file
- Files: `backend/.env` (checked into git)
- Current mitigation: `.env` appears to be in `.gitignore` (verify), but credentials are visible in file system
- Recommendations:
  1. Verify `.gitignore` properly excludes `.env` and all variants (`.env.local`, `.env.*.local`)
  2. Rotate all exposed secrets immediately (API keys, database passwords visible in file)
  3. Use environment-specific secret injection (GitHub Secrets for CI, Vercel Environment Variables for deployments)
  4. Document secret rotation procedure in CONTRIBUTING.md
  5. Consider using tools like git-secrets or pre-commit hooks to prevent accidental commits

**Hardcoded OAuth Redirect URIs:**
- Risk: CORS configuration hardcodes allowed origins including specific Vercel projects
- Files: `backend/api/src/index.ts` (lines 48-79)
- Current mitigation: Fallback validation checks Vercel pattern matching
- Recommendations:
  1. Move hardcoded origins to environment variables
  2. Document required CORS setup per deployment environment
  3. Add validation to reject invalid origins early (current code warns but allows fallback)

**Tool Approval System Design Risk:**
- Risk: User-provided `modified_params` in approval resolution could bypass validator checks
- Files: `backend/chat/graph/nodes/tool_executor.py`, `backend/chat/approval/handlers.py`
- Current mitigation: Pre-approval validation catches invalid IDs, but post-approval only validates if user modifies form
- Recommendations:
  1. Always run validation on modified_params regardless of approval context
  2. Document that dangerous tools require full parameter re-validation
  3. Add audit logging of all approval modifications

**Token Storage and Encryption:**
- Risk: OAuth tokens stored in database with encryption key in environment variable
- Files: `backend/shared/token_service.py` (caches tokens in memory), `backend/api/src/db/schema.ts`
- Current mitigation: Encryption implemented via `TOKEN_ENCRYPTION_SECRET`, tokens are short-lived
- Recommendations:
  1. Document token rotation mechanism
  2. Implement token expiration monitoring
  3. Consider using database-backed secret store (e.g., Vault) for production
  4. Add metrics for token refresh failures

**Organization Membership Validation:**
- Risk: User can claim any organization via `x-organization-id` header; validation relies on database query
- Files: `backend/api/src/middleware/auth.ts` (lines 40-54, 78-88)
- Current mitigation: Queries neon_auth.member table to verify membership, fails closed (denies if query fails)
- Recommendations:
  1. Cache org membership checks to reduce database load
  2. Add rate limiting on failed org validation attempts
  3. Log suspicious org claims for security auditing

## Performance Bottlenecks

**Polling-Based Approval Waiting:**
- Problem: Approval handlers use polling with 0.1s sleep interval for up to 600s timeout
- Files: `backend/chat/approval/handlers.py` (lines 109-161)
- Cause: No event notification system; relies on file system changes
- Improvement path: Implement event-driven approval using Server-Sent Events (SSE) or WebSocket push from frontend. Would reduce latency and CPU waste.

**Multiple Sequential MCP Tool Calls:**
- Problem: Specialist node can execute 10+ MCP tool calls sequentially during conversation
- Files: `backend/chat/graph/nodes/specialist.py`, `backend/chat/tools/loader.py`
- Cause: Tools are awaited one-by-one in tool executor
- Improvement path: Implement parallel tool execution where dependencies allow. Could significantly reduce latency for queries requiring multiple data points.

**Entity Caching with TTL Issues:**
- Problem: In-memory entity cache per provider with 5-minute TTL, but cache key doesn't include organization
- Files: `backend/chat/utils/entity_resolver.py` (lines 47-82)
- Cause: Multi-tenant systems may have stale data across organizations
- Improvement path: Include organization ID in cache key, implement cache invalidation on provider updates.

**Full State Graph Serialization:**
- Problem: LangGraph state is completely serialized to SSE events on every node execution
- Files: `backend/chat/streaming/processor.py` (lines 350-600)
- Cause: Includes all historical messages, tool calls, and context in each event
- Improvement path: Send incremental updates (only changed fields) to reduce network bandwidth.

**No Pagination for Entity Lists:**
- Problem: Entity loader fetches all accounts, apps, ad units at once without pagination
- Files: `backend/chat/graph/nodes/entity_loader.py` (lines 200-250)
- Cause: API may return thousands of entities; all loaded into memory
- Improvement path: Implement pagination with on-demand loading based on context.

## Fragile Areas

**Tool Approval Form Schema Generation:**
- Files: `backend/chat/approval/schema_extractor.py` (974 lines), `backend/chat/approval/handlers.py`
- Why fragile: Complex logic to convert MCP tool schemas to React JSON Schema Form (RJSF) format. Handles multiple schema variations (UI format vs API format, JSON strings vs objects).
- Safe modification: Test both old and new tool schemas when modifying. Maintain separate test schemas for mediation_group_lines, bidding_lines, waterfall_lines formats.
- Test coverage: `backend/tests/test_approval.py` covers approval handlers but not schema conversion. Need tests for edge cases like nested objects, array validation.

**LangGraph State Merging:**
- Files: `backend/chat/graph/state.py` (lines 12-39)
- Why fragile: Custom merge functions for dicts and tool_calls. Tool call merging by ID could lose data if same ID is used for different operations.
- Safe modification: Document merge semantics clearly. Test concurrent updates to state. Ensure tool_call IDs are globally unique across entire session.
- Test coverage: No explicit tests for state merging logic.

**Multi-Format Tool Parameter Support:**
- Files: `backend/chat/graph/nodes/tool_executor.py` (lines 139-300), `backend/chat/adapters/mediation.py`
- Why fragile: UI sends mediation data as nested objects; API expects flat format. Code handles both formats plus JSON string variants.
- Safe modification: Maintain comprehensive test matrix for all format combinations. Document format conversions with examples.
- Test coverage: Only indirect testing via E2E tests.

**Provider Token Fallback Chain:**
- Files: `backend/shared/token_service.py` (lines 30-93)
- Why fragile: Token fetching tries three methods (API, env var, service account) with silent fallbacks. Unclear which token is actually being used.
- Safe modification: Add debug logging showing which token source was used. Implement explicit token source configuration.
- Test coverage: No unit tests for token service. Should mock each fallback path.

**Rate Limiter In-Memory Store:**
- Files: `backend/chat/middleware/rate_limit.py` (lines 67-150)
- Why fragile: Uses in-memory sliding window algorithm. Doesn't persist across restarts. Single-process only.
- Safe modification: Switch to Redis-backed implementation before scaling to multiple workers. Document limitations.
- Test coverage: Rate limit logic not tested.

**Entity Resolution Validation:**
- Files: `backend/chat/graph/validators.py`, `backend/chat/graph/nodes/tool_executor.py` (lines 139-300)
- Why fragile: Validates entity IDs by querying API, but validation is cached and may return stale results. Error messages are generated from API response code patterns.
- Safe modification: Test with actual API responses from AdMob/GAM. Document all error code patterns being checked.
- Test coverage: Some validation tests exist but not comprehensive coverage of all error conditions.

## Scaling Limits

**Single-Process State Management:**
- Current capacity: Supports single concurrent user/request
- Limit: File-based state breaks with multiple worker processes. Multiple users on same process will have race conditions.
- Scaling path: Implement distributed state store (Redis) + event bus for cross-process communication.

**In-Memory Token Cache:**
- Current capacity: Unbounded cache in `shared/token_service.py`
- Limit: Memory grows unbounded as new users connect. No cache eviction.
- Scaling path: Implement LRU cache with size limit (e.g., 1000 tokens max). Fallback to API for evicted tokens.

**Entity Cache Without Distributed Invalidation:**
- Current capacity: Per-process entity cache with 5-minute TTL
- Limit: Doesn't work across multiple processes. No way to invalidate when provider data changes.
- Scaling path: Move to Redis-backed cache with pub/sub invalidation on provider updates.

**File-Based Approval Storage:**
- Current capacity: Approvals stored in temp directory files
- Limit: Multiple processes will write to same files, causing corruption. Lost on restart.
- Scaling path: Database-backed approval store with proper locking and transactions.

**Sequential Tool Execution:**
- Current capacity: Single tool at a time. 1 tool = ~1s, 10 tools = ~10s latency
- Limit: Cannot parallelize tool calls even when independent
- Scaling path: Implement parallel execution for tools without dependencies.

## Dependencies at Risk

**Pydantic Version Constraint:**
- Risk: Pinned to 2.12.5, warning suppression indicates 2.13+ needed
- Impact: Build warnings, unclear upgrade path
- Migration plan: Test with Pydantic 2.13+ and remove warning suppression in same PR.

**LangGraph and LangChain Coupling:**
- Risk: Tight coupling to specific LangGraph/LangChain versions. Streaming architecture depends on interrupt() mechanism.
- Impact: Difficult to upgrade; any breaking changes in LangGraph cascade through entire graph
- Migration plan: Abstract graph execution behind interface to reduce coupling. Create adapter layer.

**Python Version Support:**
- Risk: Code uses Python 3.14+ workarounds (UTF-8 reconfiguration in `chat_server.py`), unclear if 3.10+ is still supported
- Impact: Environment setup issues, unclear minimum version
- Migration plan: Document minimum supported Python version explicitly in README and requirements.txt.

**Next.js 16 with React 19:**
- Risk: Using bleeding-edge versions. React 19 is still very new, limited community support
- Impact: Potential breaking changes, fewer Stack Overflow answers for issues
- Migration plan: Consider pinning to LTS versions (Next.js 14/15, React 18) if stability is priority.

## Missing Critical Features

**No Observability for Long-Running Approvals:**
- Problem: If user closes browser after approval prompt, graph continues running and tool executes silently
- Blocks: Can't tell if tool actually executed or was pending
- Solution: Implement WebSocket push or persistent polling UI to track approval completion

**No Rate Limiting for LLM API Calls:**
- Problem: Specialist node can trigger multiple LLM calls per conversation without limits
- Blocks: No cost control, users could accidentally incur large bills
- Solution: Implement per-user/org token quota with warnings at 80%/95%

**No Audit Logging for Tool Executions:**
- Problem: Can't trace who approved which tools or what parameters were modified
- Blocks: Compliance/security audits impossible
- Solution: Implement audit log table with all tool executions, approvals, modifications

**No Monitoring for Failed Tool Approvals:**
- Problem: If approval file gets corrupted or lost, user gets stuck with no error message
- Blocks: Users can't recover from transient state issues
- Solution: Implement approval status monitoring with fallback to denial after timeout

## Test Coverage Gaps

**Backend API Route Tests:**
- What's not tested: Most API endpoints (only `health.test.ts` exists)
- Files: `backend/api/src/routes/` (23 route files)
- Risk: Regressions in auth, billing, provider sync undetected until production
- Priority: HIGH - Add integration tests for /api/providers, /api/billing, /api/chat endpoints

**Graph State Merging:**
- What's not tested: State merging logic for concurrent updates
- Files: `backend/chat/graph/state.py`
- Risk: State corruption in parallel tool execution scenarios
- Priority: MEDIUM - Add unit tests for merge_dicts() and merge_tool_calls()

**Entity Validation:**
- What's not tested: Full matrix of validation error conditions
- Files: `backend/chat/graph/validators.py`
- Risk: Users get unexpected error messages, validation doesn't catch all invalid states
- Priority: HIGH - Add tests for each error code pattern (INVALID_ACCOUNT_ID, INVALID_AD_UNIT_ID, etc.)

**MCP Tool Registry:**
- What's not tested: Tool loading, dangerous tool detection
- Files: `backend/chat/tools/registry.py` (831 lines)
- Risk: Tools fail to load silently, dangerous tools not detected
- Priority: MEDIUM - Add tests for tool registry initialization and dangerous tool patterns

**Rate Limiting Middleware:**
- What's not tested: Rate limiter enforcement, sliding window algorithm
- Files: `backend/chat/middleware/rate_limit.py`
- Risk: Rate limits don't actually work, users can bypass
- Priority: MEDIUM - Add unit tests for rate limit checking and reset logic

**Organization Membership Validation:**
- What's not tested: Auth middleware org validation logic
- Files: `backend/api/src/middleware/auth.ts`
- Risk: Users could access other organizations' data
- Priority: HIGH - Add tests for org membership edge cases (invalid org, not member, admin user)

**Frontend Chat Streaming Edge Cases:**
- What's not tested: Network disconnection, partial message arrival, SSE event order
- Files: `frontend/src/app/(authenticated)/chat/page.tsx`
- Risk: Chat state gets out of sync with backend
- Priority: HIGH - Add E2E tests for network failures and SSE recovery

---

*Concerns audit: 2026-02-04*
