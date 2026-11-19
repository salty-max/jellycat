import { reactRouter } from "@react-router/dev/vite";
import type { StorybookConfig } from "@storybook/react-vite";
import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";

// Storybook reuses vite.config.ts, whose React Router plugins build the whole app and break in Storybook. Every plugin React
// Router's factory makes is taken out by name (not by prefix: one of them is called "prerender"), and the plain React plugin is put in
// their place, as vitest.config.ts does for the tests.
const ROUTER_PLUGINS = new Set(reactRouter().map((plugin) => plugin.name));
const isRouterPlugin = (plugin: PluginOption): boolean =>
  Array.isArray(plugin) ? plugin.some(isRouterPlugin) : !!plugin && typeof plugin === "object" && "name" in plugin && ROUTER_PLUGINS.has(plugin.name);

const config: StorybookConfig = {
  stories: ["../app/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  viteFinal: (vite) => ({ ...vite, plugins: [...(vite.plugins ?? []).filter((plugin) => !isRouterPlugin(plugin)), react()] }),
};

export default config;
