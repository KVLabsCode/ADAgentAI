/**
 * WCAG Contrast Validation Script
 *
 * Validates that color token pairs meet WCAG AA contrast requirements.
 * Run: bun run validate:contrast
 */

// Simple contrast ratio calculation (WCAG 2.1 formula)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = luminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA: 4.5:1 for normal text, 3:1 for large text
// WCAG AAA: 7:1 for normal text, 4.5:1 for large text
function isLevelAA(ratio: number): boolean {
  return ratio >= 4.5;
}

function isLevelAAA(ratio: number): boolean {
  return ratio >= 7;
}

// Token pairs to validate (foreground, background)
// These should match the actual colors from globals.css
const tokenPairs = [
  // Light theme - text on backgrounds
  {
    fg: "#0f172a", // foreground (oklch(0.141 0.005 285.823) ≈ #0f172a)
    bg: "#ffffff", // background (oklch(1 0 0) = white)
    name: "text-primary on bg-light",
  },
  {
    fg: "#64748b", // muted-foreground (oklch(0.552 0.016 285.938) ≈ #64748b)
    bg: "#ffffff",
    name: "text-muted on bg-light",
  },

  // Dark theme - text on backgrounds
  {
    fg: "#f8fafc", // foreground dark (oklch(0.985 0 0) ≈ #f8fafc)
    bg: "#141416", // background dark (oklch(0.141 0.005 285.823) ≈ #141416)
    name: "text-primary on bg-dark",
  },
  {
    fg: "#94a3b8", // muted-foreground dark (oklch(0.705 0.015 286.067) ≈ #94a3b8)
    bg: "#141416",
    name: "text-muted on bg-dark",
  },

  // Interactive elements - light theme
  {
    fg: "#f8fafc", // primary-foreground
    bg: "#1e1e21", // primary (oklch(0.21 0.006 285.885) ≈ #1e1e21)
    name: "white on primary-light",
  },
  {
    fg: "#ffffff",
    bg: "#dc2626", // destructive (oklch(0.577 0.245 27.325) ≈ #dc2626)
    name: "white on destructive",
  },
  {
    fg: "#ffffff",
    bg: "#22c55e", // success (oklch(0.646 0.2 145) ≈ #22c55e)
    name: "white on success",
  },

  // Interactive elements - dark theme
  {
    fg: "#1e1e21", // primary-foreground dark
    bg: "#e2e8f0", // primary dark (oklch(0.92 0.004 286.32) ≈ #e2e8f0)
    name: "dark on primary-dark",
  },

  // Warning always uses dark text
  {
    fg: "#0f172a",
    bg: "#eab308", // warning (oklch(0.828 0.189 84.429) ≈ #eab308)
    name: "dark-text on warning",
  },

  // Info
  {
    fg: "#ffffff",
    bg: "#3b82f6", // info (oklch(0.6 0.2 250) ≈ #3b82f6)
    name: "white on info",
  },
];

interface Result {
  name: string;
  ratio: number;
  AA: boolean;
  AAA: boolean;
}

const results: Result[] = tokenPairs.map(({ fg, bg, name }) => {
  const ratio = getContrastRatio(fg, bg);
  return {
    name,
    ratio: Math.round(ratio * 100) / 100,
    AA: isLevelAA(ratio),
    AAA: isLevelAAA(ratio),
  };
});

console.log("\n=== WCAG Contrast Validation ===\n");
console.table(results);

const failures = results.filter((r) => !r.AA);
if (failures.length > 0) {
  console.error(
    "\n❌ WCAG AA failures:",
    failures.map((f) => `${f.name} (${f.ratio}:1)`).join(", ")
  );
  console.error("   Required: 4.5:1 minimum for normal text\n");
  process.exit(1);
} else {
  console.log("\n✅ All contrast ratios pass WCAG AA (4.5:1 minimum)");
}

// Additional check for large text (AA requires 3:1)
const largeTextFailures = results.filter((r) => r.ratio < 3);
if (largeTextFailures.length > 0) {
  console.warn(
    "\n⚠️  Warning: These pairs don't meet AA for large text (3:1):",
    largeTextFailures.map((f) => `${f.name} (${f.ratio}:1)`).join(", ")
  );
}
