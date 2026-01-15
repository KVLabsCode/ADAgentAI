# Theme & Design System

This project uses shadcn/ui with a custom theme. All design tokens are defined in `frontend/src/app/globals.css`.

## Color Tokens

Use semantic tokens, not hardcoded Tailwind colors.

### Core Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | Near-black | Light gray | Primary actions, links |
| `secondary` | Light gray | Dark gray | Secondary buttons, backgrounds |
| `muted` | Light gray | Dark gray | Disabled states, subtle backgrounds |
| `accent` | Light gray | Dark gray | Hover states, highlights |

### Semantic Colors

| Token | Usage | Example Classes |
|-------|-------|-----------------|
| `destructive` | Errors, delete actions | `text-destructive`, `bg-destructive` |
| `success` | Success states, confirmations | `text-success`, `bg-success/10` |
| `warning` | Warnings, caution | `text-warning`, `bg-warning/10` |
| `info` | Information, tips | `text-info`, `bg-info/10` |

### Surface Colors

| Token | Usage |
|-------|-------|
| `background` | Page background |
| `foreground` | Default text |
| `card` | Card backgrounds |
| `popover` | Dropdown/popover backgrounds |
| `border` | All borders |
| `input` | Input field borders |
| `ring` | Focus rings |

### Sidebar

| Token | Usage |
|-------|-------|
| `sidebar` | Sidebar background |
| `sidebar-foreground` | Sidebar text |
| `sidebar-primary` | Active nav items |
| `sidebar-accent` | Hover states |
| `sidebar-border` | Dividers |

### Charts

| Token | Color |
|-------|-------|
| `chart-1` | Orange (light) / Blue (dark) |
| `chart-2` | Teal (light) / Green (dark) |
| `chart-3` | Blue (light) / Yellow (dark) |
| `chart-4` | Yellow (light) / Purple (dark) |
| `chart-5` | Gold (light) / Red (dark) |

## Typography

- **Sans**: `font-sans` (Geist Sans)
- **Mono**: `font-mono` (Geist Mono)

## Spacing & Radius

Base radius: `0.625rem` (10px)

| Token | Value |
|-------|-------|
| `rounded-sm` | 6px |
| `rounded-md` | 8px |
| `rounded-lg` | 10px |
| `rounded-xl` | 14px |

## Button Variants

From `frontend/src/components/ui/button.tsx`:

| Variant | Usage |
|---------|-------|
| `default` | Primary actions |
| `destructive` | Delete, remove, danger |
| `outline` | Secondary actions |
| `secondary` | Tertiary actions |
| `ghost` | Icon buttons, subtle actions |
| `link` | Inline text links |

**Sizes**: `sm`, `default`, `lg`, `icon`, `icon-sm`, `icon-lg`

## Do's and Don'ts

### Colors

```tsx
// ✅ Good - semantic tokens
<span className="text-success">Saved</span>
<span className="text-destructive">Error</span>
<div className="bg-warning/10 text-warning">Warning</div>

// ❌ Bad - hardcoded colors
<span className="text-emerald-500">Saved</span>
<span className="text-red-500">Error</span>
<div className="bg-amber-100 text-amber-600">Warning</div>
```

### Backgrounds

```tsx
// ✅ Good
<div className="bg-card">...</div>
<div className="bg-muted">...</div>

// ❌ Bad
<div className="bg-white dark:bg-gray-900">...</div>
```

### Borders

```tsx
// ✅ Good
<div className="border border-border">...</div>

// ❌ Bad
<div className="border border-gray-200 dark:border-gray-700">...</div>
```

## Dark Mode

Dark mode is handled automatically via the `.dark` class on the root element. All semantic tokens adapt automatically.

## Scrollbars

Custom scrollbar styling is applied globally. Use `scrollbar-thin` class for subtle scrollbars that appear on hover.
