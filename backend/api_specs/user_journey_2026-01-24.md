# ADAgentAI User Journey (Detailed, Word-to-Word)
Date: 2026-01-24

## 0) Purpose
This document describes the exact end-to-end user journey for ADAgentAI, including how users connect providers, how chat requests flow, how approvals work, and what happens on failure. It is written as a script-like flow to guide UX and agent behavior.

## 1) Actors
- User: a developer, growth, or monetization manager who wants to set up or optimize ads.
- Agent: the LangGraph system using MCP tools.
- UI: the frontend (chat + settings + approvals forms).

## 2) Entry Points
- Entry A: User starts in Settings (preferred for account setup).
- Entry B: User starts in Chat (agent detects missing connections and guides setup).

## 3) Global Rules (must always apply)
1) Show only connected providers by default.
2) If a requested action needs a provider that is not connected, show it as disabled with a clear “Connect” CTA.
3) Every write or configuration change requires approval (interrupt) unless user is in Developer Override mode.
4) If prerequisite read steps fail, do NOT attempt create/update. Ask user to fix or explicitly force override.
5) Do not auto-retry deterministic failures. Retry only transient failures 1–3 times.
6) Every tool call result is summarized for the user before moving to the next step.

## 4) User Journeys (Word-to-Word)

### 4.1 First-Time Setup via Settings (Preferred)
1) User opens the app.
2) UI shows “No providers connected.”
3) User clicks “Connect a provider.”
4) UI displays a list of providers (AdMob, GAM, AppLovin, Unity, etc.) with a short description and a “Connect” button.
5) User clicks “Connect AdMob.”
6) UI opens OAuth or credential flow.
7) User completes login.
8) UI shows “AdMob connected.”
9) UI asks if the user wants to connect another provider.
10) User clicks “Skip for now.”
11) UI shows a summary: “Connected providers: AdMob. You can now use Chat.”

### 4.2 First-Time Setup via Chat (Agent-Driven)
1) User types: “Create a mediation group for my iOS app.”
2) Agent checks connected providers and cannot find one.
3) Agent responds: “I can do that, but no provider is connected. Please connect AdMob or GAM. Which one do you want to use?”
4) UI shows a “Connect Provider” panel inline, with AdMob/GAM options.
5) User clicks “Connect AdMob.”
6) OAuth flow completes.
7) Agent resumes: “AdMob is connected. Which app should I use?”
8) User selects an app from a dropdown (populated by a read tool call).
9) Agent continues with the mediation flow.

### 4.3 Normal Read-Only Request (Safe)
1) User types: “Show revenue for last 7 days.”
2) Agent selects the Reporting capability.
3) Agent loads accounts and apps.
4) Agent retrieves tool shortlist for reporting (connected providers only).
5) Agent calls reporting tool(s).
6) UI streams progress (“Fetching AdMob revenue…”).
7) Agent returns a final summary + optional chart.

### 4.4 Mediation Group Create (Write + Approval)
1) User types: “Create a mediation group for my Android app.”
2) Agent asks: “Which provider should I use?”
3) User: “AdMob.”
4) Agent checks prerequisites (apps, ad units, ad sources).
5) Agent finds missing ad sources.
6) Agent responds: “I can’t create the mediation group yet. Missing ad sources. Please connect ad sources or choose Developer Override to fill fields manually.”
7) User clicks “Developer Override.”
8) UI shows a form with missing fields marked.
9) User fills fields and clicks “Approve.”
10) Agent executes the create tool.
11) Agent returns success + summary + next steps.

### 4.5 Mediation Group Update (Write + Approval)
1) User types: “Change my waterfall order.”
2) Agent loads current mediation group.
3) Agent proposes changes and opens approval form.
4) User edits fields.
5) User clicks “Approve.”
6) Tool executes.
7) Agent returns final summary and confirmation.

### 4.6 Failure Path (Prerequisite Read Fails)
1) User types: “Create mediation group.”
2) Agent attempts to list ad units and fails with a permission error.
3) Agent stops and explains: “I can’t access ad units. Please check permissions or reconnect the provider.”
4) UI shows “Reconnect provider” button.
5) No create call is attempted.

### 4.7 Retry Path (Transient Failure)
1) User requests an update.
2) Tool call fails with timeout.
3) Agent retries automatically up to 3 times with backoff.
4) If it still fails, agent asks: “I couldn’t complete the request. Do you want me to retry or stop?”

### 4.8 Developer Override (Testing)
1) User toggles Developer Override in settings.
2) UI shows a warning: “This bypasses prerequisites. Use for testing only.”
3) Agent allows create forms to open even when prerequisites are missing.
4) All actions still require explicit approval.

## 5) Provider Connection Rules (UI and Agent)
- Default state: show only connected providers.
- If the user asks for a task on a disconnected provider:
  - Show provider as disabled + “Connect” CTA.
  - Ask the user to connect or pick another connected provider.
- If multiple providers are connected:
  - Ask “Which provider should I use?”
  - Offer a short list (with last-used provider highlighted).

## 6) Suggested UI Copy (Inline)
- Missing provider: “I can do that, but this provider isn’t connected yet.”
- Missing prerequisites: “I can’t proceed because required data is missing: {list}. Please fix or use Developer Override.”
- Approval step: “Review and approve before I apply changes.”
- Retry prompt: “This failed due to a temporary error. Retry or stop?”

## 7) Notes for Implementation
- Store the connected provider list in user session state.
- Store “last used provider” per user for faster routing.
- Use tool allowlists per task + provider before binding tools.
- Ensure approvals are required for all write tools.

## 8) Open Questions (for product decision)
- Should provider connection be allowed in chat or only in settings?
- Do we allow auto-selection of provider if only one is connected?
- How visible should Developer Override be (hidden vs explicit toggle)?
