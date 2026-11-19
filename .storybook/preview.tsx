import type { Preview } from "@storybook/react-vite";
import "@fontsource/vt323";
import "../app/app.css";

// axe runs on every story and fails it, and with it the Vitest run, on a violation.
const preview: Preview = {
  parameters: { a11y: { test: "error" } },
  globalTypes: {
    phosphor: {
      description: "Phosphor colour",
      toolbar: { title: "Phosphor", items: ["green", "amber", "white"], dynamicTitle: true },
    },
  },
  initialGlobals: { phosphor: "green" },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.phosphor = String(context.globals.phosphor ?? "green");
      return <Story />;
    },
  ],
};

export default preview;
