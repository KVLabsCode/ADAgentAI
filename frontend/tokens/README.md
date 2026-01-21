# Design Tokens (W3C DTCG Format)

This directory contains design tokens in the **W3C Design Tokens Community Group (DTCG)** format.
These tokens are the single source of truth for all design values and can be synced to:

- **Figma** (via Tokens Studio plugin)
- **Penpot** (native import)
- **Sketch** (via Supernova)
- **Code** (CSS, Tailwind, SCSS, JSON, TypeScript)

## Directory Structure

```
tokens/
├── primitives/           # Raw values (not for direct use)
│   ├── colors.tokens.json
│   ├── spacing.tokens.json
│   ├── typography.tokens.json
│   ├── radius.tokens.json
│   ├── shadow.tokens.json
│   ├── motion.tokens.json
│   └── breakpoints.tokens.json
├── semantic/             # Theme-aware aliases
│   ├── dark.tokens.json
│   ├── light.tokens.json
│   └── typography.tokens.json
├── components/           # Component-specific tokens
│   ├── button.tokens.json
│   ├── card.tokens.json
│   ├── input.tokens.json
│   ├── settings.tokens.json
│   ├── tabs.tokens.json
│   └── badge.tokens.json
├── style-dictionary.config.mjs
└── README.md
```

## Usage

### Generate CSS from Tokens

```bash
# One-time build
bun run tokens:build

# Watch mode (rebuild on changes)
bun run tokens:watch
```

This generates:
- `src/styles/tokens.css` - All CSS custom properties
- `src/styles/tokens-dark.css` - Dark theme overrides
- `src/styles/tokens-light.css` - Light theme overrides
- `src/styles/tokens.json` - JSON for JavaScript
- `src/styles/tokens.d.ts` - TypeScript types

### Sync to Figma

1. Install [Tokens Studio](https://tokens.studio/) plugin in Figma
2. Connect to this GitHub repo
3. Point to `frontend/tokens/` directory
4. Tokens sync bidirectionally!

### Token Format (DTCG)

All tokens use the W3C DTCG format with `$value` and `$type`:

```json
{
  "color": {
    "$type": "color",
    "primary": {
      "$value": "#7c3aed",
      "$description": "Brand purple"
    }
  }
}
```

### Referencing Tokens

Use curly braces to reference other tokens:

```json
{
  "button": {
    "background": {
      "$value": "{color.primary}",
      "$type": "color"
    }
  }
}
```

## Three-Tier Architecture

| Tier | Purpose | Example |
|------|---------|---------|
| **Primitives** | Raw values, hidden from designers | `color.gray.900: #0d0d10` |
| **Semantic** | Intent-based, theme-aware | `background.primary: {color.gray.950}` |
| **Components** | Specific to UI elements | `button.primary.background: {accent.default}` |

## Source

These tokens were extracted from Linear's design system and converted to DTCG format.
See `linear_reverse/` for the original extraction.
