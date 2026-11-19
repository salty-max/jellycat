import type { Preview } from "@storybook/react-vite";
import "@fontsource/vt323";
import "../app/app.css";

const preview: Preview = {
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
