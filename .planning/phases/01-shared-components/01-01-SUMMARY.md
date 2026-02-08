---
phase: 01-shared-components
plan: 01
subsystem: design-system
tags: [css, dark-theme, typography, linear-style, gradients, marketing]

dependency-graph:
  requires: []
  provides:
    - Linear dark theme CSS utilities (gradients, glows, borders)
    - Marketing typography scale (hero to meta)
  affects:
    - 01-02 (FadeIn component can use theme utilities)
    - 01-03 (MarketingCard uses theme and typography)
    - 01-04 (FeatureGrid uses typography)
    - 01-05 (NavFooter uses typography)
    - All marketing page implementations (phases 02-06)

tech-stack:
  added: []
  patterns:
    - CSS custom properties with fallbacks to design tokens
    - Utility-first CSS classes for composition
    - Responsive typography with mobile-first breakpoints

key-files:
  created:
    - frontend/src/styles/linear-typography.css
  modified:
    - frontend/src/app/globals.css
  pre-existing:
    - frontend/src/styles/linear-theme.css (created in prior 01-02 plan execution)

decisions:
  - id: typography-breakpoint
    choice: 768px mobile breakpoint
    rationale: Aligns with Tailwind md: convention, provides good tablet/phone split
  - id: color-fallbacks
    choice: CSS custom properties with fallback values
    rationale: Graceful degradation if tokens not loaded, maintains consistency with existing token system
  - id: gradient-purple
    choice: rgba(124, 58, 237, 0.15) for glow-purple
    rationale: Uses existing --color-purple-500 (#7c3aed) with 15% opacity for subtle atmospheric effect

metrics:
  tasks: 3/3
  duration: ~9 minutes
  completed: 2026-02-05
---

# Phase 01 Plan 01: Linear Theme Utilities Summary

**One-liner:** CSS utilities for Linear-style dark marketing pages with purple glows, gradient backgrounds, and premium typography hierarchy.

## What Was Built

### 1. Linear Dark Theme Utilities (`linear-theme.css`)
Atmospheric dark theme CSS utilities for marketing pages:

**CSS Custom Properties:**
- `--linear-bg-base`, `--linear-bg-elevated`, `--linear-bg-subtle` - Surface colors
- `--linear-glow-purple`, `--linear-glow-white` - Atmospheric glow colors
- `--linear-border-subtle` through `--linear-border-strong` - Border hierarchy

**Gradient Utilities:**
- `.bg-linear-gradient` - Radial purple glow from top-center
- `.bg-linear-spotlight` - Focused top-down illumination
- `.bg-linear-fade` - Edge vignette effect
- `.bg-linear-ambient` - Multi-layer subtle atmosphere
- `.bg-linear-mesh` - Complex multi-point glow

**Glow Effects:**
- `.glow-card` - Subtle card elevation with hover state
- `.glow-accent` / `.glow-accent-strong` - Purple CTA emphasis
- `.glow-text` / `.glow-text-strong` - Text shadow glow
- `.glow-pulse` - Animated attention effect

**Border Utilities:**
- `.border-linear` / `.border-linear-hover` - Subtle borders with transitions
- `.border-linear-gradient` - Premium gradient border effect

**Page Wrappers:**
- `.linear-marketing-page` - Complete marketing page setup
- `.linear-hero-section` / `.linear-feature-section` - Section-specific backgrounds

### 2. Linear Typography System (`linear-typography.css`)
Marketing-specific typography with tight letter-spacing:

**Typography Scale:**
```
.text-hero     - 56px (40px mobile), -0.03em tracking
.text-display  - 40px (32px mobile), -0.02em tracking
.text-headline - 32px (24px mobile), -0.02em tracking
.text-title    - 20px (18px mobile), -0.01em tracking
.text-body-lg  - 18px (16px mobile)
.text-body     - 16px
.text-meta     - 13px, muted color
.text-small    - 12px
```

**Color Utilities:**
- `.text-linear-primary` - Maximum contrast (#f7f8f8)
- `.text-linear-secondary` - Supporting content (#b4bcd0)
- `.text-linear-muted` - Auxiliary text (#8a8f98)

**Gradient Text:**
- `.text-gradient-primary` - White to gray fade
- `.text-gradient-accent` - Purple accent gradient
- `.text-gradient-subtle` - Soft depth effect

**Marketing Presets:**
- `.marketing-hero-headline` - Complete hero styling
- `.marketing-hero-subheadline` - Subheadline preset
- `.marketing-section-headline` - Section header preset
- `.marketing-feature-title/description` - Feature card presets

### 3. Integration
Both files imported into `globals.css`:
```css
@import "../styles/linear-theme.css";
@import "../styles/linear-typography.css";
```

## Implementation Notes

### Token Integration
All utilities reference existing design tokens with fallbacks:
```css
--linear-bg-base: var(--color-surface-0, #08090a);
color: var(--color-content-1, #f7f8f8);
```

### Responsive Strategy
Typography scales down at 768px breakpoint (md:) using mobile-first media queries. Gradient backgrounds remain consistent across breakpoints.

### Performance
- No JavaScript required - pure CSS utilities
- CSS custom properties enable efficient theming
- `text-wrap: balance/pretty` for optimal typography rendering

## Deviations from Plan

### Pre-existing File
**1. linear-theme.css already existed**
- **Found during:** Task 1 verification
- **Issue:** File was created in prior 01-02 plan execution (commit 964776d)
- **Resolution:** Verified file contains all required utilities, no changes needed
- **Impact:** None - content matches plan requirements exactly

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 964776d (prior) | linear-theme.css (pre-existing) |
| 2 | b26ec60 | Create Linear typography system |
| 3 | 9e1f8d8 | Import utilities into globals.css |

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/styles/linear-typography.css` | Created - 285 lines |
| `frontend/src/app/globals.css` | Added 2 import lines |

## Verification

- [x] All three CSS files exist with non-empty content
- [x] globals.css imports both linear-theme.css and linear-typography.css
- [x] linear-theme.css contains `--linear-glow` variables
- [x] linear-typography.css contains `.text-hero` class
- [x] Pre-commit hooks pass (TypeScript, tests)

## Next Steps

This plan provides the visual foundation for:
- **Plan 01-02:** FadeIn scroll animation component
- **Plan 01-03:** MarketingCard component (uses glows, borders, typography)
- **Plan 01-04:** FeatureGrid component (uses typography)
- **Plan 01-05:** NavFooter component (uses typography)
