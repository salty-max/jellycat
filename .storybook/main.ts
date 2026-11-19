import { reactRouter } from "@react-router/dev/vite";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";

// Storybook reuses vite.config.ts, whose React Router plugins build the whole app and break in Storybook. Every plugin React
// Router's factory makes is taken out by name (not by prefix: one of them is called "prerender"), and the plain React plugin is put in
// their place, as vitest.config.ts does for the tests.
const ROUTER_PLUGINS = new Set(reactRouter().map((plugin) => plugin.name));
const isRouterPlugin = (plugin: PluginOption): boolean =>
  Array.isArray(plugin) ? plugin.some(isRouterPlugin) : !!plugin && typeof plugin === "object" && "name" in plugin && ROUTER_PLUGINS.has(plugin.name);

const isTailwindPlugin = (plugin: PluginOption): boolean =>
  Array.isArray(plugin)
    ? plugin.some(isTailwindPlugin)
    : !!plugin && typeof plugin === "object" && "name" in plugin && plugin.name.startsWith("@tailwindcss/vite");

const config: StorybookConfig = {
  stories: ["../app/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: { name: "@storybook/react-vite", options: {} },
  // Tailwind is taken out and put back here, so it is in the plugin list whether or not vite.config.ts's copy reaches Vitest's story projects.
  viteFinal: (vite) => ({
    ...vite,
    plugins: [...(vite.plugins ?? []).filter((plugin) => !isRouterPlugin(plugin) && !isTailwindPlugin(plugin)), react(), tailwindcss()],
  }),
};

export default config;
