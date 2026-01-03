# PRD — Chat-First Frontend (Early Access)

## Tooling Context

### Frontend
- React
- Next.js (App Router)
- shadcn/ui
- TanStack Query
- TanStack Table
- TanStack Virtual
- Zod

### Backend
- Bun
- Hono (main API server)
- Hono RPC
- Zod
- **Agent Service:**
  - FastAPI (Python web framework for agent endpoints)
  - CrewAI (multi-agent orchestration)
  - MCP Servers (AdMob, Google Ad Manager)
  - Note: FastAPI service runs separately, called by Hono via HTTP

### Authentication
- Better Auth
- Google OAuth (Sign-In only, no email/password)

### Database
- PostgreSQL
- Neon
- Drizzle ORM

### Payments & Billing
- Polar

### Hosting
- Frontend: Vercel
- Main Backend (Hono): Render
- Agent Service (FastAPI): Render (separate service)
- Database: Neon

### Product & Ops
- Linear
- GitHub + PRs
- GitHub Actions
- Sentry
- PostHog
- Confluence

### Testing
- Vitest (unit/integration tests)
- Playwright (E2E tests)
- React Testing Library (component tests)

### Theme
- Light mode
- Dark mode
- User preference (system default or manual toggle)

---

## Scope
This document defines **frontend behavior, layout, and UI states only**.

Out of scope:
- Agent logic
- MCPs
- Backend orchestration
- Data fetching strategy
- Prompting or reasoning design

The frontend assumes:
- A chat-based AI assistant
- Optional visibility into reasoning and tool usage
- Early-access gating before usage

---

## 1. Product Shape (Frontend Only)

- Web app
- Chat-first interface (ChatGPT / Claude style)
- Minimal navigation
- Early access required before chat is usable
- Integrations gate what the assistant can do

---

## 2. High-Level Screens

App structure:
- Early Access Landing
- Sign In / Sign Up (Google OAuth only)
- App (with sidebar navigation)
  - Dashboard (default after login)
  - Chat
  - Chat History
  - Connected Providers (ad platform accounts)
  - Billing
  - Support
  - Settings
- Supported Platforms (public-facing docs page)
- Blog

**Sidebar Navigation (Authenticated Users):**
- Dashboard (home/overview)
- New Chat
- Chat History (with search/filter)
- Connected Providers (ad platforms: AdMob, GAM)
- Billing (Polar integration)
- Support (help/contact)
- Settings
- Account

**Top Navigation (Public):**
- Logo | Platforms | Blog | Sign In with Google

**Authentication:**
- Google Sign-In only (no email/password)
- Better Auth handles Google OAuth flow
- User profile populated from Google account

**Note:** 
- Dashboard shows useful metrics/overview for ad management use case (TBD: specific widgets)
- Connected Providers = ad platform accounts (AdMob, Google Ad Manager) user has connected via OAuth
- Chat history with export functionality
- Billing managed through Polar
- Support includes help docs, contact form, or ticketing
- Supported Platforms = documentation showing all platforms we support (public page)

---

## 3. Core Chat UI Behavior

### 3.1 Chat Layout Rules

**With Sidebar:**
- Sidebar on left (collapsible)
- Chat area takes remaining space
- New chat starts **centered** in chat area
- After first message:
  - Messages stack vertically
  - Input fixed at bottom of chat area
- Chat scrolls, input does not
- Settings button in chat header for per-chat account toggles

---

### 3.2 Message Types

Each message can be one of:

- User message
- Assistant message
- Tool call (collapsed by default)
- Tool result (collapsed by default)
- System notice (integration missing, error, etc.)

---

### 3.3 Assistant Message Structure

Assistant responses are split into **sections**:

1. **Agent Name (always visible)** — Shows which agent is handling the request (e.g., "AdMob Agent", "Reporter Agent")
2. **Visible Answer (default)**
3. **Thinking (collapsed)** — Agent's reasoning process
4. **Tool Calls (collapsed)**
5. **Tool Results (collapsed)**

Sections (1) and (2) are visible by default.

---

### 3.4 Expand / Collapse Rules

- Thinking, tool calls, and tool results:
  - Hidden by default
  - Expandable per message
- Agent name is **always visible**
- Expansion is **user-controlled**
- No auto-expansion
- Use Claude/ChatGPT-style disclosure UI:
  - Collapsed: `▸ Show thinking`, `▸ Show tool calls`
  - Expanded: `▾ Thinking`, `▾ Tool calls` with content visible
  - Same pattern for tool results

---

## 4. Chat States

### 4.1 Dashboard (Default Landing After Login)

**Purpose:** Overview screen, not chat-focused yet

**Content (TBD - Keep Simple for MVP):**
- Welcome message
- Quick stats (connected accounts count, recent chat count)
- Quick actions:
  - Start New Chat button
  - Connect Account button
- Recent activity feed (last 3-5 chats)
- System notifications (if any)

**Note:** Dashboard design to be finalized based on primary user workflows.

---

### 4.2 Empty Chat — No Providers Connected

**When:** User clicks "New Chat" but has no connected ad platform accounts

- Input is disabled
- Clear message: "Connect an ad platform account to get started"
- CTA button to navigate to Connected Providers in sidebar
- Sidebar remains visible with "Connected Providers" section highlighted

---

### 4.3 Empty Chat — Providers Connected

**When:** User starts a new chat with ad platform accounts connected

- Input is enabled
- Shows example prompts
- Settings gear icon in chat header (expands provider toggle panel)
- Ready to accept first message

**Provider Controls (Via Settings Gear):**
- Lists all connected ad platform provider accounts
- Each provider account has a toggle: Enable/Disable for this chat
- Visual indicators:
  - Green = enabled for chat
  - Gray = connected but disabled for chat
- Shows provider identifiers (Publisher ID for AdMob, Network Code for GAM, etc.)

**MVP Constraint Message:**
When multiple providers enabled, show:
> "Note: Enabling fewer providers may improve response quality. We're working on better multi-provider support."

---

### 4.4 Active Conversation

- User and assistant messages alternate
- Assistant messages show agent name and answer by default
- Disclosure controls for thinking, tool calls, and tool results
- All internal details collapsed by default
- **Settings gear remains accessible** to toggle providers mid-conversation
- Sidebar shows current chat highlighted in Chat History

---

### 4.5 Expanded Internals

- Claude/ChatGPT-style disclosure pattern
- Shows thinking when expanded
- Shows tool call details when expanded
- Shows tool results when expanded

---

## 5. Ad Platform Providers & Connected Accounts

### 5.1 Two Distinct Needs

**A. Connected Providers (User-Specific Ad Platform Accounts)**
- Shows which ad platform accounts the user has connected (AdMob publisher accounts, GAM networks)
- Displays connection status and identifiers
- Provides connect/disconnect controls
- **Placement TBD:** Chat sidebar (expandable), Settings page, or dedicated Providers page

**B. Supported Platforms (Documentation/Marketing)**
- Lists all ad platforms we support (AdMob, GAM, etc.)
- Shows which platforms are available now vs coming soon
- Acts as a reference/docs page
- **Placement:** Likely a dedicated page or section in docs/marketing site
- **Purpose:** Help users understand what ad platforms they can connect before they sign up or while exploring

---

### 5.2 Connected Providers Display (User-Specific)

**Two Contexts:**

**A. Provider Management (Global)**
- View all connected ad platform accounts across the app
- Connect/disconnect providers via OAuth
- See provider identifiers and status

**B. Chat Settings (Per-Chat)**
- Toggle which connected providers are **enabled for the current chat**
- Accessible via settings button in chat interface
- Changes only affect the current conversation

**Requirements for Each Connected Provider:**
- Provider type (AdMob, Google Ad Manager, etc.)
- Connection status indicator (green circle = connected globally)
- Chat enablement toggle (green = enabled for this chat, gray = disabled for this chat)
- Relevant identifiers:
  - AdMob: Publisher ID (e.g., pub-xxxxxxxx)
  - GAM: Network Code (e.g., 1234567) + Account Name
- Connect/Disconnect action (in global view only)

**MVP Guidance:**
- Show warning when multiple providers enabled: "Enabling fewer providers may improve response quality. We're working on better multi-provider support."
- Default behavior: newly connected providers are enabled for all chats (can be refined later)

**Potential Placements:**
- **Global Management:** Settings page or dedicated "My Providers" page
- **Chat-Level Control:** Expandable settings panel within chat interface (gear icon)

---

### 5.3 Supported Platforms Page (Documentation)

**Requirements:**
- List all supported ad platforms
- For each platform, show:
  - Platform name and logo
  - Brief description of capabilities
  - Status: "Available", "Coming Soon", "Beta"
  - Link to platform-specific documentation
- Marketing/educational tone
- Public-facing (can be viewed before sign-up)

**Placement:**
- Dedicated page accessible from main navigation
- Could be part of marketing site or docs
- Example routes: `/platforms`, `/integrations`, `/supported-platforms`

---

### 5.4 Platform-Specific Identifiers

**AdMob:**
- Publisher ID (e.g., pub-xxxxxxxx)

**Google Ad Manager:**
- Network Code (primary identifier)
- Account Name (secondary, human-readable)

Reason for GAM choice:
- Network Code is canonical
- Account Name is human-readable
- Matches GAM UI mental model

---

### 5.5 Multiple Accounts Detected

If OAuth returns multiple accounts:
- Show account selection modal
- List accounts with Network Code and Account Name
- Radio button selection
- Chat remains blocked until selection confirmed

---

## 6. Early Access States (Frontend)

### 6.1 Pending Approval

- User can sign in
- App is locked
- Chat input disabled
- Message shown: "Your early access request is under review."

---

### 6.2 Approved

- Full frontend access
- Chat enabled
- Integrations available

---

### 6.3 Rejected (Optional)

- Access blocked
- Explanation message
- No retry CTA by default

---

## 7. UI Components (Strictly Frontend)

Reusable components:

**Layout Components:**
- Sidebar navigation
  - Collapsible sidebar
  - Navigation items with icons
  - Active state indicators
- Dashboard grid/layout
- Top bar (public)

**Chat Components:**
- Chat message bubble
  - user
  - assistant (with agent name badge)
- Agent name badge
- Expandable disclosure block
- Thinking block
- Tool call block
- Tool result block
- Chat input bar
- Disabled input state
- Chat settings panel (expandable)
  - Provider toggle list
  - Provider enable/disable toggle
  - MVP warning message (multiple providers)

**Account & Provider Components:**
- Connected provider card (global management view)
- Platform card (for Supported Platforms page)
- Connection status indicator (green circle = connected globally)
- Chat enablement indicator (green = enabled for chat, gray = disabled)
- Status badge

**Chat History Components:**
- Chat history list
- Chat history item (with preview, date, metadata)
- Search/filter bar
- Export modal (format selection)
- Delete confirmation modal

**Billing Components:**
- Plan/subscription card
- Usage metrics display (progress bars)
- Payment method card
- Invoice list item
- Upgrade/downgrade modal
- Cancel subscription modal
- Polar checkout redirect

**Support Components:**
- FAQ accordion
- Contact form
- Ticket list (if applicable)
- Help article viewer
- System status banner
- Feedback form

**Dashboard Components (TBD):**
- Summary cards
- Quick action buttons
- Activity feed
- Notification center

**Shared Components:**
- OAuth modal
- Confirmation modal
- Empty-state panel

No complex dashboards or analytics charts (yet - keep MVP simple).

---

## 8. Navigation

### Sidebar Navigation (Authenticated App)

**Primary Navigation (Always Visible):**
- Dashboard (home icon)
- New Chat (+ icon or button)
- Chat History (list icon)
  - Search/filter chats
  - Export chat functionality
  - Recent chats shown
- Connected Providers (integration icon)
  - Ad platform accounts (AdMob, GAM)
  - Quick toggle for enabled providers
  - Connection status indicators
- Billing (credit card icon)
  - Current plan
  - Usage/limits
  - Payment methods
  - Invoices
- Support (help/question icon)
  - Help documentation
  - Contact form
  - Ticket status (if applicable)
- Settings (gear icon)
- Account (user avatar/menu)

**Sidebar Behavior:**
- Collapsible (expand/collapse)
- Persistent across app screens
- Highlights current section

### Top Navigation (Public/Marketing)

Top bar contains: Logo | Platforms | Blog | Sign In

**Post-Login:**
- Top bar minimal: Logo | User Menu
- Main navigation moves to sidebar

### Dashboard (TBD - Specific Widgets)

Default landing screen after login. Potential widgets:
- Recent chat activity
- Connected accounts summary
- Ad performance snapshot (if data available)
- Quick actions (New Chat, Connect Account)
- System notifications

**Note:** Dashboard content to be refined based on core use cases for ad platform management.

### Chat History Management

Accessible from sidebar:
- List all past conversations
- Search by content or date
- Filter by date range or platform
- Export individual chats (markdown, PDF, or JSON)
- Delete conversations
- Archive functionality (optional)

---

### Billing Screen

Managed through Polar integration:

**Required Elements:**
- Current plan/subscription status
- Usage metrics (if applicable):
  - Messages used / limit
  - Connected accounts / limit
  - API calls / limit (if relevant)
- Payment methods
  - Add/remove cards
  - Default payment method
- Invoice history
  - Download invoices
  - View past payments
- Upgrade/downgrade options
- Cancel subscription (with confirmation)

**Polar Integration Notes:**
- Polar handles payment processing
- Subscription management UI
- Webhook integration for subscription events
- Redirect to Polar checkout when needed

---

### Support Screen

**Required Elements:**
- Help Documentation
  - FAQ section
  - Getting started guides
  - Integration setup guides
  - Troubleshooting
- Contact Options
  - Contact form (email support)
  - Expected response time
  - Optional: Live chat widget
  - Optional: Ticket status tracking
- System Status (optional)
  - Current platform status
  - Recent incidents
- Feedback
  - Feature requests
  - Bug reporting

**Support Channels (TBD):**
- Email support (definite)
- Live chat (optional, later)
- Ticketing system (optional, if scale requires)
- Community forum (optional, future)

---

## 9. Data Assumptions (UI-Level Only)

The frontend expects:

### Chat Message
- id
- role (user | assistant | tool | system)
- content
- agent_name (e.g., "AdMob Agent", "Reporter Agent") - always visible for assistant messages
- has_thinking
- has_tool_calls
- has_tool_results

### Connected Provider
- provider (e.g., "admob", "gam")
- status (connected | disconnected)
- is_enabled_for_chat (boolean - per-chat setting)
- display_identifiers
  - For AdMob: publisher_id
  - For GAM: network_code, account_name

### Chat Session
- enabled_providers (array of provider account IDs enabled for this specific chat)

No assumptions about how data is fetched.

---

## 10. Non-Goals (Explicit)

This frontend does NOT:
- Show verbose tool execution details automatically
- Act without integrations
- Replace dashboards
- Expose raw backend errors

---

## 11. UX Constraints (Concrete)

- Default view = minimal
- Details = opt-in via expand
- One main action per screen
- Chat is the product

---

## END OF DOCUMENT