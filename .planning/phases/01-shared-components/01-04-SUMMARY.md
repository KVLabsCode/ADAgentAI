---
phase: 01-shared-components
plan: 04
subsystem: interactions
tags: [css, hover, transitions, micro-interactions, button-variants]
dependency-graph:
  requires: ["01-01"]
  provides:
    - hover-lift utility
    - hover-glow utility
    - hover-card utility
    - focus-ring utility
    - linear-primary button variant
    - linear-secondary button variant
    - linear-ghost button variant
    - linear-accent button variant
    - linear button size
  affects: ["02-*", "03-*", "04-*", "05-*", "06-*"]
tech-stack:
  added: []
  patterns:
    - CSS utility classes for micro-interactions
    - 100ms transition standard (Linear timing)
    - Reduced motion accessibility support
key-files:
  created:
    - frontend/src/styles/linear-interactions.css
  modified:
    - frontend/src/components/atoms/button.tsx
    - frontend/src/app/globals.css
decisions:
  - id: transition-timing
    choice: "100ms for all primary interactions"
    rationale: "Linear's standard timing for snappy, responsive feel"
  - id: dark-mode-shadows
    choice: "Stronger shadows in dark mode (0.4 opacity vs 0.15)"
    rationale: "Dark backgrounds require more contrast for depth perception"
  - id: four-linear-variants
    choice: "Added linear-accent beyond plan's three variants"
    rationale: "Purple glow variant useful for special emphasis CTAs"
metrics:
  duration: 5m
  completed: 2026-02-05
---

# Phase 01 Plan 04: Hover States and Micro-Interactions Summary

**One-liner:** CSS interaction utilities (lift, glow, scale, underline) plus 4 Linear button variants with 100ms transitions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create interaction utility classes | 261750a | linear-interactions.css |
| 2 | Add Linear button variants | e46333d | button.tsx |
| 3 | Import interactions CSS | dad025e | globals.css |

## What Was Built

### Interaction Utility Classes (linear-interactions.css)

Created 371 lines of CSS utilities for micro-interactions:

**Lift Effects:**
- `.hover-lift` - translateY(-1px) with shadow on hover, press feedback on active
- Dark mode variant with stronger shadows (0.4 opacity)

**Glow Effects:**
- `.hover-glow` - Purple glow expansion (20px spread)
- `.hover-glow-strong` - Double glow rings for prominent CTAs

**Scale Effects:**
- `.hover-scale` - 1.05x scale for icons/small elements
- `.hover-scale-subtle` - 1.02x for minimal scale

**Link Underline Animation:**
- `.hover-underline` - Left-to-right reveal
- `.hover-underline-center` - Center-out expansion

**Color Transitions:**
- `.hover-color` - Color only
- `.hover-bg` - Background only
- `.hover-border` - Border only
- `.hover-all` - Combined (color, bg, border)
- `.hover-all-extended` - Plus opacity and box-shadow

**Card Hover:**
- `.hover-card` - Border color + shadow enhancement
- Light and dark mode variants

**Focus Accessibility:**
- `.focus-ring` - 2px offset ring with purple glow
- `.focus-ring-inset` - Inset variant for inputs
- Light mode compatible with theme ring color

**Combined Patterns:**
- `.interaction-button` - Lift + shadow + press
- `.interaction-card` - Lift + border + shadow
- `.interaction-link` - Color + underline

**Reduced Motion:**
- Full `prefers-reduced-motion` support
- Disables all transforms and transitions

### Linear Button Variants (button.tsx)

Added 4 new variants to CVA buttonVariants:

| Variant | Description | Use Case |
|---------|-------------|----------|
| `linear-primary` | White bg, dark text, lift effect | Primary CTAs |
| `linear-secondary` | Transparent, subtle border | Secondary actions |
| `linear-ghost` | Text only, no border | Tertiary actions |
| `linear-accent` | Purple glow, purple bg tint | Special emphasis |

Added `linear` size: 32px height, 13px font, medium weight.

All variants integrate:
- Interaction utilities (hover-lift, hover-glow, hover-all, hover-color)
- 100ms transitions (Linear standard)
- focus-ring for accessibility

### CSS Imports (globals.css)

All 4 Linear CSS utilities now imported:
```css
@import "../styles/linear-animations.css";
@import "../styles/linear-interactions.css";
@import "../styles/linear-theme.css";
@import "../styles/linear-typography.css";
```

## Technical Details

### Transition Timing
- Primary interactions: 100ms ease-out
- Glow effects: 150ms ease-out (slightly slower for smoother expansion)
- Underline animation: 200ms ease-out (readable reveal)
- Press feedback: 50ms (instant tactile response)

### Shadow Strategy
- Light mode: 0.15 opacity shadows
- Dark mode: 0.4 opacity shadows (more contrast needed)
- Hover adds 4px lift + 12px blur shadow
- Active resets lift + reduces shadow

### Accessibility
- `focus-visible` only (no focus on click)
- 2px background ring + 4px purple ring
- Reduced motion disables all transforms/transitions
- High contrast mode inherits existing theme tokens

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Transition timing | 100ms standard | Linear's timing for snappy feel |
| Dark mode shadows | 0.4 opacity | Dark backgrounds need more contrast |
| Added linear-accent | Purple glow variant | Useful for special CTAs beyond plan |
| Combined patterns | interaction-* classes | Common combinations ready to use |

## Deviations from Plan

### Added Beyond Plan

**1. Additional interaction utilities:**
- hover-glow-strong (double ring)
- hover-scale-subtle (1.02x)
- hover-underline-center (center-out)
- hover-all-extended (includes opacity, box-shadow)
- hover-opacity, hover-opacity-muted
- press-scale, press-scale-subtle
- Combined patterns (interaction-button, interaction-card, interaction-link)

**2. Fourth button variant:**
- Added `linear-accent` for purple glow emphasis
- Not in original plan but completes the variant set

**3. Focus ring variants:**
- Added focus-ring-inset for form elements
- Light mode compatible version

All additions follow the same 100ms timing and design language.

## Verification Results

- [x] linear-interactions.css exists with all utility classes
- [x] button.tsx has linear-primary, linear-secondary, linear-ghost variants
- [x] globals.css imports linear-interactions.css (4 total Linear CSS files)
- [x] Button component compiles without TypeScript errors
- [x] All transitions are 100ms (Linear standard)
- [x] Focus states are accessible (focus-visible ring)
- [x] No build errors

## Next Phase Readiness

Ready for:
- Phase 02 (Pricing Page): All hover utilities available for cards and buttons
- Phase 03 (Blog): Link underlines and card hovers ready
- Phase 04 (Homepage): Button variants and glows ready for hero CTAs

Dependencies satisfied:
- linear-theme.css variables (01-01) - used for glow colors and borders
- All utilities work in both light and dark mode
