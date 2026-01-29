# Linear Theme Migration Guide

Guide to using the extracted Linear design tokens and patterns in ADAgentAI.

## Table of Contents

1. [What We Extracted](#what-we-extracted)
2. [Linear's Design Philosophy](#linears-design-philosophy)
3. [Token Mapping](#token-mapping)
4. [Typography System](#typography-system)
5. [Color System](#color-system)
6. [Component Patterns](#component-patterns)
7. [Migration Steps](#migration-steps)
8. [Linear MCP Integration](#linear-mcp-integration)

---

## What We Extracted

The `linear_reverse/` directory contains assets scraped from Linear's public and authenticated app:

```
linear_reverse/
├── css/                    # Raw CSS files from marketing site
├── bundles/                # JavaScript bundles
├── debundled/              # Decompiled JS modules
├── fonts/
│   └── InterVariable.woff2 # Linear's primary font
├── analysis/
│   ├── color-tokens.txt    # Extracted color token names
│   ├── components-from-css.txt  # Component names from CSS modules
│   └── radius-tokens.txt   # Border radius values
├── authenticated/
│   ├── Root.css            # Product app CSS with design tokens
│   └── components/         # Extracted component patterns
│       ├── Select.js
│       ├── Form.js
│       ├── Tabs.js
│       ├── IconButton.js
│       ├── EmptyState.js
│       └── useTheme.js
└── theme-tokens.txt        # All CSS custom properties
```

---

## Linear's Design Philosophy

### Key Principles

1. **Subtle layering** - Backgrounds use 4-5 levels of depth (primary, secondary, tertiary, quaternary, quinary)
2. **Muted colors** - Text uses multiple levels of contrast (primary, secondary, tertiary, quaternary)
3. **Functional aesthetics** - Every element serves a purpose, no decoration
4. **High information density** - Compact layouts with efficient use of space

### Design Characteristics

| Aspect | Linear's Approach |
|--------|-------------------|
| **Colors** | Dark mode default, subtle purple tints |
| **Typography** | Inter font, 450 weight as "normal" |
| **Spacing** | Tight padding, consistent gaps |
| **Borders** | Subtle, translucent borders |
| **Shadows** | Minimal, layered for elevation |

---

## Token Mapping

### ADAgentAI → Linear Equivalent

| Our Token | Linear Token | Notes |
|-----------|--------------|-------|
| `--tokenBackgroundPrimary` | `--color-bg-primary` | Main background |
| `--tokenBackgroundSecondary` | `--color-bg-secondary` | Cards, elevated |
| `--tokenBackgroundTertiary` | `--color-bg-tertiary` | Hover states |
| `--tokenForegroundPrimary` | `--color-text-primary` | Main text |
| `--tokenForegroundSecondary` | `--color-text-secondary` | Muted text |
| `--tokenForegroundTertiary` | `--color-text-tertiary` | Descriptions |
| `--tokenBorderDefault` | `--color-border-primary` | Subtle borders |
| `--tokenAccentDefault` | `--color-accent` | Brand purple |

### Linear's Extended Color Scale

Linear uses **5 levels** for backgrounds and text:

```css
/* Backgrounds (dark mode) */
--color-bg-primary: #08090a;      /* Deepest */
--color-bg-secondary: #1c1c1f;    /* Cards */
--color-bg-tertiary: #232326;     /* Hover */
--color-bg-quaternary: #28282c;   /* Code blocks */
--color-bg-quinary: #282828;      /* Subtle accents */

/* Text (dark mode) */
--color-text-primary: #f7f8f8;    /* Brightest */
--color-text-secondary: #b4bcd0;  /* Slightly muted */
--color-text-tertiary: #8a8f98;   /* Descriptions */
--color-text-quaternary: #86848d; /* Very muted */
```

---

## Typography System

### Font Family

Linear uses Inter Variable with specific settings:

```css
--font-regular: "Inter Variable", "SF Pro Display", -apple-system,
                BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-monospace: "Berkeley Mono", ui-monospace, "SF Mono", Menlo, monospace;
--font-settings: "cv01", "ss03";  /* OpenType features */
--font-variations: "opsz" auto;   /* Optical sizing */
```

### Font Sizes

| Token | Size | Usage |
|-------|------|-------|
| `--font-size-micro` | 0.6875rem (11px) | Tiny labels |
| `--font-size-mini` | 0.75rem (12px) | Buttons, tabs |
| `--font-size-small` | 0.8125rem (13px) | Body text |
| `--font-size-regular` | 0.9375rem (15px) | Default |
| `--font-size-large` | 1.125rem (18px) | Headings |
| `--font-size-title1` | 2.25rem (36px) | Hero titles |
| `--font-size-title2` | 1.5rem (24px) | Page titles |
| `--font-size-title3` | 1.25rem (20px) | Section titles |

### Font Weights

Linear uses slightly heavier weights than typical:

| Token | Value | Standard Equivalent |
|-------|-------|---------------------|
| `--font-weight-light` | 300 | Light |
| `--font-weight-normal` | 450 | **Not 400** - "Book" weight |
| `--font-weight-medium` | 500 | Medium |
| `--font-weight-semibold` | 600 | Semibold |
| `--font-weight-bold` | 700 | Bold |

**Important**: Linear's "normal" is 450, not 400. This gives text a slightly heavier feel.

---

## Color System

### Brand Colors

```css
--color-accent: #7170ff;          /* Primary purple */
--color-accent-hover: #828fff;    /* Hover state */
--color-accent-tint: #18182f;     /* Dark tinted background */
--color-brand-bg: #5e6ad2;        /* Alternative brand */
--color-indigo: #5e6ad2;          /* Indigo accent */
```

### Semantic Colors

```css
--color-blue: #4ea7fc;
--color-green: #4cb782;
--color-yellow: #f2c94c;
--color-orange: #fc7840;
--color-red: #eb5757;
```

### Border Colors

Linear uses translucent borders for subtlety:

```css
/* Dark mode */
--color-border-primary: rgba(255, 255, 255, 0.08);
--color-border-secondary: rgba(255, 255, 255, 0.12);
--color-border-tertiary: rgba(255, 255, 255, 0.15);
--color-border-translucent: rgba(255, 255, 255, 0.05);

/* Light mode */
--color-border-primary: #e9e8ea;
--color-border-secondary: #e4e2e4;
--color-border-tertiary: #dcdbdd;
```

---

## Component Patterns

### Button Variants

```css
/* Height scale */
--button-height: 24px;  /* Tiny */
--button-height: 32px;  /* Small */
--button-height: 40px;  /* Default */
--button-height: 48px;  /* Large */

/* Padding scale */
--button-padding: 0 10px;  /* Compact */
--button-padding: 0 12px;  /* Default */
--button-padding: 0 16px;  /* Spacious */

/* Corner radius */
--button-corner-radius: var(--radius-6);   /* 6px */
--button-corner-radius: var(--radius-8);   /* 8px */
--button-corner-radius: var(--radius-rounded); /* Pill */
```

### Input Fields

```css
--input-height: 36px;  /* Standard input height */
```

### Radius Scale

```css
--radius-4: 4px;
--radius-6: 6px;
--radius-8: 8px;
--radius-12: 12px;
--radius-16: 16px;
--radius-24: 24px;
--radius-32: 32px;
--radius-circle: 50%;
--radius-rounded: 9999px;
```

### Animation Timing

```css
--speed-quickTransition: 0.1s;     /* Instant feedback */
--speed-regularTransition: 0.25s;  /* Standard */
--speed-slowTransition: 0.35s;     /* Deliberate */
--speed-highlightFadeIn: 0s;       /* Immediate */
--speed-highlightFadeOut: 0.15s;   /* Subtle */
```

### Easing Functions

Linear includes a comprehensive set of easing curves:

```css
--ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
--ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
--ease-in-out-cubic: cubic-bezier(0.645, 0.045, 0.355, 1);
```

---

## Migration Steps

### Step 1: Evaluate Current Tokens

Compare your current tokens against Linear's system:

```bash
# View Linear's extracted tokens
cat linear_reverse/theme-tokens.txt

# View our current tokens
cat frontend/tokens/primitives/colors.tokens.json
```

### Step 2: Update Primitives

Add Linear-inspired values to `frontend/tokens/primitives/`:

**colors.tokens.json additions:**
```json
{
  "color": {
    "bg": {
      "level-0": { "$type": "color", "$value": "#08090a" },
      "level-1": { "$type": "color", "$value": "#0f1011" },
      "level-2": { "$type": "color", "$value": "#141516" },
      "level-3": { "$type": "color", "$value": "#191a1b" }
    }
  }
}
```

**typography.tokens.json additions:**
```json
{
  "fontWeight": {
    "book": { "$type": "fontWeight", "$value": 450 }
  }
}
```

### Step 3: Update Semantic Tokens

Map the new primitives to semantic tokens in `semantic/dark.tokens.json`:

```json
{
  "background": {
    "quaternary": { "$type": "color", "$value": "{color.bg.level-2}" },
    "quinary": { "$type": "color", "$value": "{color.bg.level-3}" }
  }
}
```

### Step 4: Rebuild Tokens

```bash
cd frontend
bun run tokens:build
```

### Step 5: Update Components

Apply Linear-inspired patterns to components:

```tsx
// Before
<button className="h-10 px-4 text-sm">

// After (Linear-style)
<button className="h-8 px-3 text-[13px] font-[450]">
```

---

## Linear MCP Integration

### Setting Up Linear MCP

Claude Code can interact with Linear for tracking design system work.

1. **Get Linear API Key**:
   - Go to Linear → Settings → API → Personal API Keys
   - Create a new key with appropriate scopes
   - Copy the key

2. **Configure MCP**:
   The Linear MCP is already configured in this project.

### Using Linear for Design System Tasks

**Create a design system issue:**
```
"Create a Linear issue in the Design System project for adding
the new quaternary background token to our color system"
```

**Track component migration:**
```
"Create Linear issues to track migrating these components to
use Linear-style spacing: Button, Card, Input"
```

**Query existing issues:**
```
"Show me all open issues in Linear related to the design system"
```

### Recommended Linear Labels

| Label | Purpose |
|-------|---------|
| `design-system` | All design system work |
| `tokens` | Token-related changes |
| `components` | Component updates |
| `figma-sync` | Figma synchronization |
| `migration` | Migration tasks |

---

## Reference Files

### Key Linear Files

| File | Contains |
|------|----------|
| `linear_reverse/theme-tokens.txt` | All CSS custom properties |
| `linear_reverse/authenticated/Root.css` | Product app styles |
| `linear_reverse/analysis/color-tokens.txt` | Color token names |
| `linear_reverse/fonts/InterVariable.woff2` | Inter font file |

### Extracted Components

| Component | File | Description |
|-----------|------|-------------|
| Select | `authenticated/components/Select.js` | Dropdown select |
| Form | `authenticated/components/Form.js` | Form patterns |
| Tabs | `authenticated/components/Tabs.js` | Tab navigation |
| IconButton | `authenticated/components/IconButton.js` | Icon buttons |
| EmptyState | `authenticated/components/EmptyState.js` | Empty states |
| useTheme | `authenticated/components/useTheme.js` | Theme hook |

---

## Further Reading

- [Design System Guide](design-system.md) - Full design system overview
- [Figma Integration](figma-integration.md) - Figma setup with Tokens Studio
- [Theme Documentation](theme.md) - Current semantic tokens
- [Linear Documentation](https://linear.app/docs) - Official Linear docs
