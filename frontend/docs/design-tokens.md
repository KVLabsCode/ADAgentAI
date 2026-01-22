# Design Tokens Guide

This guide explains the W3C DTCG design token system used in ADAgentAI.

## Table of Contents

1. [What Are Design Tokens?](#what-are-design-tokens)
2. [Why W3C DTCG Format?](#why-w3c-dtcg-format)
3. [Architecture Overview](#architecture-overview)
4. [Working with Tokens](#working-with-tokens)
5. [Figma Integration](#figma-integration)
6. [Token Reference](#token-reference)
7. [Best Practices](#best-practices)

---

## What Are Design Tokens?

Design tokens are the **single source of truth** for design decisions. Instead of hardcoding colors, spacing, and typography throughout your codebase, you define them once and reference them everywhere.

```
Before: color: #7c3aed;
After:  color: var(--tokenAccentDefault);
```

When you change a token value, it updates everywhere automatically.

---

## Why W3C DTCG Format?

The **W3C Design Tokens Community Group** released the stable v1 specification in October 2025. This format is now the industry standard, supported by:

| Tool | Support |
|------|---------|
| **Tokens Studio** (Figma) | Native DTCG import/export |
| **Style Dictionary** (Amazon) | DTCG transforms via sd-transforms |
| **Penpot** | Native import |
| **Supernova** | Full DTCG support |
| **Specify** | DTCG sync |

### Token Format

```json
{
  "button": {
    "background": {
      "$type": "color",
      "$value": "#7c3aed",
      "$description": "Primary button background"
    }
  }
}
```

Key properties:
- `$value` - The actual value
- `$type` - Token type (color, dimension, fontWeight, etc.)
- `$description` - Documentation (optional but recommended)

---

## Architecture Overview

The token system uses a **three-tier architecture**:

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

### Why Three Tiers?

1. **Primitives** - Raw values that never change based on theme. Hidden from designers.
2. **Semantic** - Theme-aware aliases that express *intent*. This is what designers see.
3. **Components** - Specific values for UI components. Derived from semantic tokens.

---

## Working with Tokens

### Build Tokens

```bash
cd frontend

# One-time build
bun run tokens:build

# Watch mode (auto-rebuild on change)
bun run tokens:watch
```

### Generated Output

After building, you'll have:

| File | Purpose |
|------|---------|
| `src/styles/tokens.css` | CSS custom properties for `:root` |
| `src/styles/tokens-dark.css` | Dark theme overrides |
| `src/styles/tokens-light.css` | Light theme overrides |
| `src/styles/tokens.json` | JSON for JavaScript imports |

### Using Tokens in Code

**In CSS/Tailwind:**
```css
.my-button {
  background-color: var(--tokenAccentDefault);
  border-radius: var(--tokenRadiusMd);
  padding: var(--tokenSpacing3) var(--tokenSpacing4);
}
```

**In React (inline):**
```tsx
<div style={{
  backgroundColor: 'var(--tokenBackgroundSecondary)',
  borderRadius: 'var(--tokenRadiusLg)'
}}>
```

**With Tailwind (arbitrary values):**
```tsx
<button className="bg-[var(--tokenAccentDefault)] rounded-[var(--tokenRadiusMd)]">
```

### Adding New Tokens

1. Choose the right tier:
   - New color shade? → `primitives/colors.tokens.json`
   - Theme-aware alias? → `semantic/dark.tokens.json` and `light.tokens.json`
   - Component-specific? → `components/<component>.tokens.json`

2. Use the DTCG format:
   ```json
   {
     "myToken": {
       "$type": "color",
       "$value": "#ff6b6b",
       "$description": "New accent color for alerts"
     }
   }
   ```

3. Rebuild:
   ```bash
   bun run tokens:build
   ```

---

## Figma Integration

The killer feature of DTCG tokens is **bidirectional sync** with Figma.

### Setup (One-Time)

1. Install [Tokens Studio](https://tokens.studio/) plugin in Figma
2. Open the plugin → Settings → Sync Providers
3. Choose "GitHub" and connect your repository
4. Point to `frontend/tokens/` directory

### Workflow

**Code → Figma:**
1. Edit tokens in your IDE
2. Commit and push
3. Tokens Studio automatically pulls changes

**Figma → Code:**
1. Designer edits tokens in Figma
2. Tokens Studio commits to a branch
3. You review the PR and merge

### Other Tools

| Tool | How to Connect |
|------|----------------|
| **Penpot** | Import JSON directly (native DTCG) |
| **Sketch** | Use Supernova to sync |
| **Webflow** | Export as CSS variables |
| **Framer** | Import tokens.json |

---

## Token Reference

### Naming Convention

Tokens follow the pattern: `--token<Category><Subcategory><Variant>`

Examples:
- `--tokenColorGray900` - Primitive gray color
- `--tokenBackgroundPrimary` - Semantic background
- `--tokenButtonPrimaryBackgroundHover` - Component-specific

### Color Tokens

| Token | Dark Value | Light Value | Usage |
|-------|------------|-------------|-------|
| `--tokenBackgroundPrimary` | `#08080a` | `#ffffff` | Main app background |
| `--tokenBackgroundSecondary` | `#0d0d10` | `#fafafb` | Cards, elevated surfaces |
| `--tokenBackgroundTertiary` | `#1c1c22` | `#f4f4f6` | Hover states |
| `--tokenForegroundPrimary` | `#ffffff` | `#0d0d10` | Main text |
| `--tokenForegroundSecondary` | `#d1d1d8` | `#2d2d34` | Muted text |
| `--tokenForegroundTertiary` | `#6b6b78` | `#6b6b78` | Descriptions |
| `--tokenAccentDefault` | `#7c3aed` | `#6d28d9` | Primary brand color |
| `--tokenSuccessDefault` | `#10b981` | `#059669` | Success states |
| `--tokenWarningDefault` | `#f59e0b` | `#d97706` | Warning states |
| `--tokenDestructiveDefault` | `#ef4444` | `#dc2626` | Error/delete states |

### Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--tokenSpacing1` | 4px | Icon + text gaps |
| `--tokenSpacing2` | 8px | Standard spacing |
| `--tokenSpacing3` | 12px | Form groups, settings rows |
| `--tokenSpacing4` | 16px | Section content |
| `--tokenSpacing6` | 24px | Major breaks |
| `--tokenSpacing12` | 48px | Section breaks |
| `--tokenSpacing16` | 64px | Page sections |

### Typography Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--tokenFontSizeMicro` | 11px | Axis labels, tiny text |
| `--tokenFontSizeMini` | 12px | Buttons, tabs, badges |
| `--tokenFontSizeSmall` | 13px | Body text, inputs |
| `--tokenFontSizeRegular` | 14px | Default body |
| `--tokenFontSizeMedium` | 15px | Section headings |
| `--tokenFontSizeLarge` | 16px | Modal titles |
| `--tokenFontSize3xl` | 24px | Page titles |
| `--tokenFontWeightBook` | 450 | Default weight (Linear-style) |
| `--tokenFontWeightMedium` | 500 | Buttons, headings |

### Component Tokens

**Buttons:**
- `--tokenButtonSizeMdHeight` - 32px
- `--tokenButtonSizeMdPaddingX` - 14px
- `--tokenButtonSizeMdFontSize` - 12px

**Cards:**
- `--tokenCardRadius` - 6px
- `--tokenCardPaddingMd` - 16px
- `--tokenCardBorderWidth` - 1px

**Inputs:**
- `--tokenInputHeight` - 36px
- `--tokenInputRadius` - 8px
- `--tokenInputPaddingX` - 12px

**Settings (Linear-verified):**
- `--tokenSettingsRowMinHeight` - 60px
- `--tokenSettingsRowPaddingY` - 12px
- `--tokenSettingsSectionGap` - 48px
- `--tokenSettingsPageMaxWidth` - 640px

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

- **Add descriptions** to new tokens
  ```json
  {
    "$value": "#7c3aed",
    "$description": "Primary accent for interactive elements"
  }
  ```

- **Keep primitives hidden** from designers - they should only see semantic tokens

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

- **Don't skip the build step** after editing tokens

- **Don't mix primitive and semantic tokens** in the same component

- **Don't create one-off tokens** for single uses

---

## Troubleshooting

### "Token reference not found"

The referenced token doesn't exist. Check:
1. Is the path correct? `{color.gray.900}` vs `{color.gray900}`
2. Is the source token in the build?

### "Build generates empty file"

Check for JSON syntax errors in token files:
```bash
cd frontend/tokens
npx jsonlint primitives/colors.tokens.json
```

### "Tokens not updating in Figma"

1. Check Tokens Studio is connected to the right branch
2. Pull latest in Tokens Studio
3. Verify the token path matches `frontend/tokens/`

---

## Resources

- [W3C DTCG Specification](https://tr.designtokens.org/format/)
- [Tokens Studio Documentation](https://docs.tokens.studio/)
- [Style Dictionary](https://amzn.github.io/style-dictionary/)
- [sd-transforms](https://github.com/tokens-studio/sd-transforms)
