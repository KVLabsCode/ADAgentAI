/**
 * Style Dictionary Configuration
 *
 * Transforms W3C DTCG design tokens into CSS custom properties.
 * Compatible with Tokens Studio for Figma sync.
 *
 * Usage:
 *   bun run tokens:build     - Generate CSS from tokens
 *   bun run tokens:watch     - Watch for changes
 *
 * Output: src/styles/tokens.css (primitives + default theme)
 */

import StyleDictionary from "style-dictionary";
import { register } from "@tokens-studio/sd-transforms";

// Register Tokens Studio transforms for DTCG format
register(StyleDictionary);

/**
 * Custom name transform: converts token path to kebab-case CSS variable
 * e.g., color.gray.500 -> --color-gray-500
 * e.g., background.primary -> --background-primary
 */
StyleDictionary.registerTransform({
  name: "name/kebab",
  type: "name",
  transform: (token) => {
    return token.path.join("-");
  },
});

/** @type {import('style-dictionary').Config} */
const config = {
  // Use DTCG parser with Tokens Studio preprocessor
  preprocessors: ["tokens-studio"],

  source: [
    // Order matters: primitives first, then semantic
    "tokens/primitives/**/*.tokens.json",
    "tokens/semantic/**/*.tokens.json",
  ],

  platforms: {
    // Primitives only - imported into globals.css
    cssPrimitives: {
      transformGroup: "tokens-studio",
      transforms: ["name/kebab"],
      buildPath: "src/styles/",
      files: [
        {
          destination: "tokens-primitives.css",
          format: "css/variables",
          filter: (token) => {
            // Only include tokens from primitives (color, spacing, typography, etc.)
            // Exclude semantic tokens
            const primitiveCategories = [
              "color",
              "spacing",
              "radius",
              "shadow",
              "duration",
              "easing",
              "breakpoint",
              "font",
              "line",
              "letter",
            ];
            return primitiveCategories.some((cat) => token.path[0].startsWith(cat));
          },
          options: {
            outputReferences: false,
            selector: ":root",
          },
        },
      ],
    },

    // All tokens (primitives + semantic) for reference
    css: {
      transformGroup: "tokens-studio",
      transforms: ["name/kebab"],
      buildPath: "src/styles/",
      files: [
        {
          destination: "tokens.css",
          format: "css/variables",
          options: {
            outputReferences: true,
            selector: ":root",
          },
        },
      ],
    },

    // Dark theme overrides only
    cssDark: {
      transformGroup: "tokens-studio",
      transforms: ["name/kebab"],
      buildPath: "src/styles/",
      source: [
        "tokens/primitives/**/*.tokens.json",
        "tokens/semantic/dark.tokens.json",
      ],
      files: [
        {
          destination: "tokens-dark.css",
          format: "css/variables",
          options: {
            outputReferences: true,
            selector: ".dark",
          },
        },
      ],
    },

    // Light theme overrides only
    cssLight: {
      transformGroup: "tokens-studio",
      transforms: ["name/kebab"],
      buildPath: "src/styles/",
      source: [
        "tokens/primitives/**/*.tokens.json",
        "tokens/semantic/light.tokens.json",
      ],
      files: [
        {
          destination: "tokens-light.css",
          format: "css/variables",
          options: {
            outputReferences: true,
            selector: ":root, .light",
          },
        },
      ],
    },

    // JSON output for TypeScript types / JS usage
    json: {
      transformGroup: "tokens-studio",
      buildPath: "src/styles/",
      files: [
        {
          destination: "tokens.json",
          format: "json/nested",
        },
      ],
    },
  },
};

export default config;
