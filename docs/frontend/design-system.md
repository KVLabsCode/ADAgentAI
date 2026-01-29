# Design System Guide

Comprehensive guide to ADAgentAI's design system, covering tokens, components, and workflows.

## Table of Contents

1. [Overview](#overview)
2. [Design Tokens](#design-tokens)
3. [Component Architecture](#component-architecture)
4. [Working with Claude](#working-with-claude)
5. [Best Practices](#best-practices)

---

## Overview

ADAgentAI uses a modern, scalable design system inspired by Linear's aesthetic:

| Feature | Implementation |
|---------|----------------|
| **Tokens** | W3C DTCG format with Style Dictionary |
| **Components** | Atomic Design (atoms/molecules/organisms) |
| **Styling** | Tailwind CSS + CSS custom properties |
| **Theming** | Dark/light with `next-themes` |
| **Design Tool** | Figma via Tokens Studio |

### Design Philosophy

- **Semantic tokens over hardcoded values** - Use `--tokenBackgroundSecondary` not `#1c1c1f`
- **Composition over inheritance** - Build complex UIs from simple parts
- **Consistency via constraints** - Limited palette, spacing scale, typography

---

## Design Tokens

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRIMITIVES (Raw Values)                   │
│  colors.tokens.json, spacing.tokens.json, typography.tokens  │
│                                                              │
│  color.purple.500: "#7c3aed"                                │
│  spacing.4: "16px"                                          │
│  fontWeight.medium: 500                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SEMANTIC (Intent-Based)                    │
│        dark.tokens.json, light.tokens.json                  │
│                                                              │
│  accent.default: "{color.purple.500}"                       │
│  background.primary: "{color.gray.950}"                     │
│  foreground.primary: "{color.white}"                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  COMPONENTS (UI-Specific)                    │
│      button.tokens.json, card.tokens.json, input.tokens      │
│                                                              │
│  button.primary.background: "{accent.default}"              │
│  card.radius: "6px"                                         │
│  input.height: "36px"                                       │
└─────────────────────────────────────────────────────────────┘
```

### Token Files

```
frontend/tokens/
├── primitives/
│   ├── colors.tokens.json      # Raw color palette
│   ├── spacing.tokens.json     # Spacing scale (4px base)
│   ├── typography.tokens.json  # Font sizes, weights
│   ├── radius.tokens.json      # Border radius values
│   ├── shadow.tokens.json      # Box shadows
│   ├── motion.tokens.json      # Animation durations
│   └── breakpoints.tokens.json # Responsive breakpoints
├── semantic/
│   ├── dark.tokens.json        # Dark theme mappings
│   └── light.tokens.json       # Light theme mappings
└── style-dictionary.config.mjs # Build configuration
```

### Building Tokens

```bash
cd frontend

# One-time build
bun run tokens:build

# Watch mode (auto-rebuild on changes)
bun run tokens:watch
```

Generated output:
- `src/styles/tokens.css` - CSS custom properties for `:root`
- `src/styles/tokens-dark.css` - Dark theme overrides
- `src/styles/tokens-light.css` - Light theme overrides
- `src/styles/tokens.json` - JSON for JavaScript imports

### Using Tokens

**In Tailwind (arbitrary values):**
```tsx
<button className="bg-[var(--tokenAccentDefault)] text-[var(--tokenForegroundPrimary)]">
  Click me
</button>
```

**In CSS:**
```css
.my-component {
  background-color: var(--tokenBackgroundSecondary);
  border-radius: var(--tokenRadiusMd);
  padding: var(--tokenSpacing3) var(--tokenSpacing4);
}
```

**In React inline styles:**
```tsx
<div style={{ backgroundColor: 'var(--tokenBackgroundTertiary)' }}>
  Content
</div>
```

---

## Component Architecture

### Atomic Design Structure

```
frontend/src/components/
├── atoms/              # Smallest building blocks
│   ├── button.tsx
│   ├── badge.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── checkbox.tsx
│   ├── switch.tsx
│   ├── avatar.tsx
│   ├── separator.tsx
│   └── skeleton.tsx
│
├── molecules/          # Combinations of atoms
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── alert-dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── select.tsx
│   ├── tabs.tsx
│   ├── accordion.tsx
│   ├── collapsible.tsx
│   └── tooltip.tsx
│
├── organisms/          # Complex feature components
│   ├── sidebar.tsx
│   ├── data-table.tsx
│   ├── chart.tsx
│   └── tool.tsx
│
└── features/           # Feature-specific
    ├── chat/
    ├── billing/
    ├── settings/
    └── admin/
```

### Component Classification

| Level | Criteria | Examples |
|-------|----------|----------|
| **Atom** | Single-purpose, no internal state management | Button, Input, Badge, Label |
| **Molecule** | Composed of atoms, may have local state | Card, Dialog, Select, Tabs |
| **Organism** | Complex, feature-rich, many sub-parts | Sidebar, DataTable, Chat |

### Import Aliases

```tsx
// Atoms
import { Button } from "@/atoms/button"
import { Input } from "@/atoms/input"

// Molecules
import { Card, CardHeader, CardContent } from "@/molecules/card"
import { Dialog, DialogContent } from "@/molecules/dialog"

// Organisms
import { Sidebar } from "@/organisms/sidebar"
```

### Variant System (CVA)

Components use `class-variance-authority` for type-safe variants:

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)
```

---

## Working with Claude

### MCP Integration

Claude Code can assist with design system work via MCP tools. Available integrations:

| MCP Server | Capabilities |
|------------|--------------|
| **Figma MCP** | Read/write Figma files, extract styles |
| **Linear MCP** | Create issues, track design system tasks |
| **Playwright** | Visual testing, screenshot comparisons |

### Figma Workflow with Claude

1. **Extract styles from Figma:**
   ```
   "Extract the color tokens from this Figma file and convert to DTCG format"
   ```

2. **Generate component code:**
   ```
   "Create a Button component matching this Figma design using our token system"
   ```

3. **Audit design compliance:**
   ```
   "Check if this component uses hardcoded colors instead of tokens"
   ```

### Linear Integration

Track design system work in Linear:

```
"Create a Linear issue for adding the new avatar component to our design system"
```

---

## Best Practices

### Do

- **Use semantic tokens** in components, not primitives
  ```css
  /* Good */
  background: var(--tokenBackgroundSecondary);

  /* Avoid */
  background: var(--tokenColorGray900);
  ```

- **Add sr-only labels** to icon buttons for accessibility
  ```tsx
  <Button variant="ghost" size="icon">
    <Trash2 className="h-4 w-4" />
    <span className="sr-only">Delete item</span>
  </Button>
  ```

- **Use specific transitions** instead of `transition-all`
  ```tsx
  /* Good */
  className="transition-colors"
  className="transition-transform"

  /* Avoid */
  className="transition-all"
  ```

- **Reference other tokens** when building component tokens
  ```json
  {
    "button.background": {
      "$value": "{accent.default}"
    }
  }
  ```

### Don't

- **Don't hardcode colors** in components
  ```css
  /* Bad */
  color: #7c3aed;
  ```

- **Don't skip the token build** after editing token files

- **Don't mix primitive and semantic tokens** in the same component

- **Don't create one-off tokens** for single uses

---

## Reference

### Color Token Categories

| Category | Purpose |
|----------|---------|
| `background.*` | Surface colors (primary, secondary, tertiary) |
| `foreground.*` | Text colors (primary, secondary, muted) |
| `accent.*` | Brand/interactive colors |
| `border.*` | Border colors |
| `destructive.*` | Error/delete states |
| `success.*` | Success states |
| `warning.*` | Warning states |

### Typography Scale

| Token | Size | Usage |
|-------|------|-------|
| `--tokenFontSizeMicro` | 11px | Labels, captions |
| `--tokenFontSizeMini` | 12px | Buttons, badges |
| `--tokenFontSizeSmall` | 13px | Body text |
| `--tokenFontSizeRegular` | 14px | Default body |
| `--tokenFontSizeMedium` | 15px | Headings |
| `--tokenFontSizeLarge` | 16px | Modal titles |
| `--tokenFontSize3xl` | 24px | Page titles |

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--tokenSpacing1` | 4px | Tight gaps |
| `--tokenSpacing2` | 8px | Standard spacing |
| `--tokenSpacing3` | 12px | Form groups |
| `--tokenSpacing4` | 16px | Section content |
| `--tokenSpacing6` | 24px | Major breaks |
| `--tokenSpacing12` | 48px | Section breaks |

---

## Further Reading

- [Figma Integration Guide](figma-integration.md) - Full Figma setup with Tokens Studio
- [Linear Theme Migration](linear-theme-migration.md) - Using extracted Linear theme tokens
- [Theme Documentation](theme.md) - Semantic color tokens reference
- [W3C DTCG Tokens](../frontend/docs/design-tokens.md) - Token system deep dive
