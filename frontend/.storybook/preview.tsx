import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        dark: { name: "dark", value: "#08080a" },
        light: { name: "light", value: "#ffffff" }
      }
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },

  globalTypes: {
    theme: {
      description: "Global theme",
      defaultValue: "dark",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },

  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || "dark";
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      return <Story />;
    },
  ],

  initialGlobals: {
    backgrounds: {
      value: "dark"
    }
  }
};

export default preview;
