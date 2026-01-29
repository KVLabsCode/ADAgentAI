# E2E Test Summary

A human-friendly overview of all 47 end-to-end tests in the ADAgentAI frontend.

---

## Smoke Tests (6 tests)

Basic sanity checks to ensure the app loads and works.

| Test | What it does |
|------|--------------|
| Should load the landing page | Opens `/` and checks the page title contains "ADAgent" or "AI" |
| Should navigate to chat when authenticated | Goes to `/chat` and confirms it doesn't redirect to login |
| Should show chat input field | Verifies the message input box is visible on the chat page |
| Should have accessible navigation | Checks that a sidebar or nav element exists |
| Should access settings page | Opens `/settings` and looks for a "Settings" heading |
| Should display mobile layout correctly | Uses 375x667 viewport and checks chat still works on mobile |

---

## Authentication Tests (17 tests)

Tests login, logout, session handling, and route protection.

### Route Protection
| Test | What it does |
|------|--------------|
| Should redirect unauthenticated user to login from chat | Without auth, visiting `/chat` should redirect to login page |
| Should redirect unauthenticated user to login from settings | Without auth, visiting `/settings` should redirect to login |
| Should redirect unauthenticated user to login from billing | Without auth, visiting `/billing` should redirect to login |
| Should allow access to public landing page | The landing page `/` should work without being logged in |

### Login Page
| Test | What it does |
|------|--------------|
| Should display login page with Google OAuth option | Login page shows a "Sign in with Google" button |
| Should show app branding on login page | Login page has the app name/logo visible |

### Authenticated User
| Test | What it does |
|------|--------------|
| Should allow access to chat when authenticated | Logged-in user can access `/chat` without redirect |
| Should show user menu when authenticated | User avatar/menu is visible when logged in |

### Logout
| Test | What it does |
|------|--------------|
| Should have logout option available | Clicking user menu shows a logout button |

### Session Persistence
| Test | What it does |
|------|--------------|
| Should maintain session across page reloads | Refreshing the page keeps you logged in |
| Should maintain session across navigation | Going to another page and back keeps session alive |

### Admin Routes
| Test | What it does |
|------|--------------|
| Should protect admin routes | Visiting `/admin` redirects non-admins away |

### Error Handling
| Test | What it does |
|------|--------------|
| Should handle invalid session gracefully | Fake session cookie redirects to login (not crash) |
| Should show user-friendly error for auth failures | No stack traces or technical errors on login page |

### OAuth Flow
| Test | What it does |
|------|--------------|
| Should have OAuth provider button visible | At least one login button exists on login page |
| Should not show login form for OAuth-only auth | No password field (we use Google OAuth only) |

---

## Chat Streaming Tests (14 tests)

Tests the SSE streaming chat functionality.

### Progressive Rendering
| Test | What it does |
|------|--------------|
| Should render response progressively during streaming | Sending a message shows the response appearing in real-time |
| Should show routing indicator during query classification | Brief "routing" or "analyzing" indicator may appear |
| Should show agent indicator for routed queries | Response indicates which agent handled the query |
| Should complete stream and remove streaming indicator | After streaming ends, typing indicator disappears |

### Tool Events
| Test | What it does |
|------|--------------|
| Should show tool indicator when tools are called | When AI uses tools, some UI indicator appears |
| Should display tool results inline | Tool results are shown in the response |

### Multiple Messages
| Test | What it does |
|------|--------------|
| Should handle multiple sequential messages | Sending 3 messages in a row results in 3 responses |
| Should maintain conversation context | Follow-up question understands context from earlier |

### Error Handling
| Test | What it does |
|------|--------------|
| Should display user-friendly error on stream failure | Network error shows friendly message (not crash) |
| Should allow retry after error | After an error, you can still send new messages |

### UI State
| Test | What it does |
|------|--------------|
| Should disable input while streaming | Input may be disabled during response (implementation-specific) |
| Should show message in chat history after streaming | Your sent message appears in the conversation |
| Should scroll to latest message | After multiple messages, the newest is scrolled into view |

### Long Responses
| Test | What it does |
|------|--------------|
| Should handle long streaming responses | Detailed explanations stream and display fully |

---

## Tool Approval Tests (10 tests)

Tests the human-in-loop approval system for dangerous operations.

### Approval Workflow
| Test | What it does |
|------|--------------|
| Should display approval dialog for dangerous tool | Asking to "create ad unit" shows Allow/Deny buttons |
| Should execute tool when approved | Clicking "Allow" executes the tool and shows "Allowed" badge |
| Should block tool when denied | Clicking "Deny" blocks the tool and shows "Denied" badge |
| Should allow editing parameters before approval | Form inputs in approval dialog can be edited before confirming |
| Should display tool name and parameters in approval dialog | Approval UI shows which tool and what arguments |

### Read Operations
| Test | What it does |
|------|--------------|
| Should not require approval for read operations | "Show me revenue" just works—no approval needed |

### Multiple Tools
| Test | What it does |
|------|--------------|
| Should handle multiple dangerous tools sequentially | "Create app and ad unit" asks for approval twice |

### UI States
| Test | What it does |
|------|--------------|
| Should show correct badge states throughout approval flow | Badge changes from "Pending" → "Allowed" after approval |
| Should collapse approval card after decision | After approving, the buttons disappear (card collapses) |

---

## Entity Resolution Tests (12 tests)

Tests that entity references are validated and hallucinations are prevented.

### Valid References
| Test | What it does |
|------|--------------|
| Should accept valid entity reference in query | "Show my AdMob revenue" works without validation errors |
| Should display available entities in context | Context settings show connected accounts/apps |

### Invalid References
| Test | What it does |
|------|--------------|
| Should show error for invalid app ID | Fake app ID like `ca-app-pub-FAKE~INVALID` shows "not found" |
| Should suggest valid alternatives when entity not found | Invalid entity gets helpful response, not crash |
| Should handle invalid publisher ID gracefully | Fake publisher ID handled without technical errors |

### Context Mode
| Test | What it does |
|------|--------------|
| Should respect soft mode by default | Queries work in soft validation mode |
| Should show entity context in response | "List my accounts" mentions accounts or says none connected |

### Error Recovery
| Test | What it does |
|------|--------------|
| Should allow retry after invalid entity error | After bad entity, next query still works |
| Should not leak internal error details to user | No Python tracebacks or stack traces in responses |

### Tool Input Validation
| Test | What it does |
|------|--------------|
| Should validate entity before tool execution | "Create ad unit in fake app" validates before showing approval |
| Should show friendly error for entity mismatch | No raw "undefined" or "[object Object]" in responses |

---

## Test Count Summary

| File | Tests |
|------|-------|
| smoke.spec.ts | 6 |
| auth.spec.ts | 17 |
| chat-streaming.spec.ts | 14 |
| tool-approval.spec.ts | 10 |
| entity-resolution.spec.ts | 12 |
| **Total** | **59** |

> Note: The 59 tests run across 2 browser configurations (Desktop Chrome + Mobile Chrome), which may result in ~118 test runs in CI.
