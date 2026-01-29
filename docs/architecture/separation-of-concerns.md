# Separation of Concerns (SoC) Guide

This guide explains how we structure React components in ADAgentAI to keep code maintainable and testable.

## Core Principle

**Components = Presentation. Hooks = Logic.**

A component's job is to render UI. Business logic, state management, and API calls belong in custom hooks.

## When to Extract a Hook

Extract logic into a hook when a component has:
- 3+ related state variables
- API calls with loading/error states
- Form submission logic
- Multi-step flows
- Complex derived state

## Naming Conventions

| Pattern | Use Case | Example |
|---------|----------|---------|
| `useXxxForm` | Form state + submission | `useAuthenticatedWaitlistForm` |
| `useXxxFlow` | Multi-step wizard | `useWaitlistFlow` |
| `useXxxAcceptance` | Consent/agreement logic | `useTosAcceptance` |
| `useXxxManagement` | CRUD operations | `useProviderManagement` |
| `useXxxOperations` | Related actions | `useAccountOperations` |

## Example: Before & After

### Before (SoC Violation)

```tsx
// ❌ Component doing too much
function WaitlistDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [useCase, setUseCase] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [position, setPosition] = useState(null)
  const [referralCode, setReferralCode] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/waitlist/join', {
        method: 'POST',
        body: JSON.stringify({ email, name, role, useCase })
      })
      const data = await res.json()
      if (data.success) {
        setPosition(data.position)
        setReferralCode(data.referralCode)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ... 200+ more lines of JSX
}
```

**Problems:**
- 9 state variables in the component
- API logic mixed with presentation
- Hard to test the submission logic
- Component is 300+ lines

### After (Clean Separation)

```tsx
// ✅ Hook handles all the logic
// hooks/useWaitlistForm.ts
export function useWaitlistForm() {
  const [state, setState] = useState({
    email: "",
    name: "",
    role: "",
    useCase: "",
    loading: false,
    error: "",
    position: null,
    referralCode: "",
  })

  const handleSubmit = async (e) => {
    // ... all the logic
  }

  return {
    ...state,
    setEmail: (v) => setState(p => ({...p, email: v})),
    setRole: (v) => setState(p => ({...p, role: v})),
    handleSubmit,
  }
}

// ✅ Component is just presentation
// components/waitlist-dialog.tsx
function WaitlistDialog() {
  const [open, setOpen] = useState(false)
  const {
    email, role, useCase, loading, error,
    position, referralCode,
    setEmail, setRole, setUseCase,
    handleSubmit
  } = useWaitlistForm()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Just JSX, no logic */}
    </Dialog>
  )
}
```

**Benefits:**
- Component is ~100 lines (just UI)
- Hook can be unit tested independently
- Logic is reusable
- Easy to understand at a glance

## Hook Structure Pattern

```tsx
// Standard hook structure
export function useMyFeature(props) {
  // 1. Combine related state
  const [state, setState] = useState({
    field1: "",
    field2: "",
    loading: false,
    error: null,
  })

  // 2. Individual setters (optional, for convenience)
  const setField1 = (value) => setState(p => ({ ...p, field1: value }))

  // 3. Action handlers
  const handleAction = async () => {
    setState(p => ({ ...p, loading: true, error: null }))
    try {
      // ... async logic
    } catch (err) {
      setState(p => ({ ...p, error: err.message }))
    } finally {
      setState(p => ({ ...p, loading: false }))
    }
  }

  // 4. Derived values
  const isValid = state.field1.length > 0 && state.field2.length > 0

  // 5. Return everything needed
  return {
    ...state,
    setField1,
    setField2,
    handleAction,
    isValid,
  }
}
```

## Real Examples in This Codebase

| Hook | Location | Purpose |
|------|----------|---------|
| `useAuthenticatedWaitlistForm` | `hooks/useAuthenticatedWaitlistForm.ts` | Waitlist form for logged-in users |
| `useWaitlistFlow` | `hooks/useWaitlistFlow.ts` | Multi-step waitlist with OAuth |
| `useTosAcceptance` | `hooks/useTosAcceptance.ts` | Terms of service acceptance |
| `useProviderManagement` | `hooks/useProviderManagement.ts` | Provider CRUD operations |
| `useOrganizationManagement` | `hooks/settings/useOrganizationManagement.ts` | Org settings |
| `useMemberManagement` | `hooks/settings/useMemberManagement.ts` | Member CRUD |
| `useInvitationManagement` | `hooks/settings/useInvitationManagement.ts` | Invitation handling |
| `useAccountOperations` | `hooks/settings/useAccountOperations.ts` | Account actions |

## File Size Guidelines

| File Type | Target Size | If Larger |
|-----------|-------------|-----------|
| Page files | < 200 lines | Extract to components |
| Components | < 300 lines | Extract hooks/sub-components |
| Hooks | < 150 lines | Split into smaller hooks |

## Testing Benefits

With separated concerns, you can:

```tsx
// Test the hook's logic in isolation
describe('useWaitlistForm', () => {
  it('validates required fields', () => {
    const { result } = renderHook(() => useWaitlistForm())
    expect(result.current.isValid).toBe(false)

    act(() => {
      result.current.setRole('developer')
      result.current.setUseCase('Testing')
    })

    expect(result.current.isValid).toBe(true)
  })

  it('handles submission errors', async () => {
    // Mock fetch to return error
    // Test that error state is set correctly
  })
})
```

## Summary

1. **Identify the violation**: Component has 3+ state variables + logic
2. **Create a hook**: `hooks/useXxxLogic.ts`
3. **Move state & logic**: Everything except `open` state for dialogs
4. **Return what's needed**: State values, setters, handlers, derived values
5. **Simplify component**: Just destructure from hook and render JSX
