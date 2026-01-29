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

/**
 * Custom format for storybook-design-token addon
 * Outputs CSS with annotations that the addon can parse
 */
StyleDictionary.registerFormat({
  name: "css/storybook-tokens",
  format: ({ dictionary }) => {
    // Map token categories to presenters
    const categoryConfig = {
      color: { title: "Colors", presenter: "Color" },
      spacing: { title: "Spacing", presenter: "Spacing" },
      radius: { title: "Border Radius", presenter: "BorderRadius" },
      shadow: { title: "Shadows", presenter: "Shadow" },
      fontSize: { title: "Font Sizes", presenter: "FontSize" },
      fontFamily: { title: "Font Families", presenter: "FontFamily" },
      fontWeight: { title: "Font Weights", presenter: "FontWeight" },
      lineHeight: { title: "Line Heights", presenter: "LineHeight" },
      letterSpacing: { title: "Letter Spacing", presenter: "LetterSpacing" },
      duration: { title: "Animation Duration", presenter: "Animation" },
      easing: { title: "Animation Easing", presenter: "Easing" },
      breakpoint: { title: "Breakpoints", presenter: "Spacing" },
    };

    // Group tokens by their root category
    const grouped = {};
    dictionary.allTokens.forEach((token) => {
      const category = token.path[0];
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(token);
    });

    // Build CSS output with annotations
    let output = "/* Auto-generated for storybook-design-token addon */\n\n";

    Object.entries(grouped).forEach(([category, tokens]) => {
      const config = categoryConfig[category] || {
        title: category.charAt(0).toUpperCase() + category.slice(1),
        presenter: "Color",
      };

      output += `/**\n * @tokens ${config.title}\n * @presenter ${config.presenter}\n */\n`;
      output += `:root {\n`;

      tokens.forEach((token) => {
        const name = token.name;
        const value = token.$value || token.value;
        output += `  --${name}: ${value};\n`;
      });

      output += `}\n\n`;
    });

    return output;
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

    // Storybook annotated CSS for design token addon
    storybook: {
      transformGroup: "tokens-studio",
      transforms: ["name/kebab"],
      buildPath: "src/styles/",
      files: [
        {
          destination: "tokens-storybook.css",
          format: "css/storybook-tokens",
          filter: (token) => {
            // Only include primitive tokens (not semantic)
            const primitiveCategories = [
              "color",
              "spacing",
              "radius",
              "shadow",
              "duration",
              "easing",
              "fontSize",
              "fontFamily",
              "fontWeight",
              "lineHeight",
              "letterSpacing",
            ];
            return primitiveCategories.some((cat) => token.path[0] === cat);
          },
        },
      ],
    },
  },
};

export default config;
