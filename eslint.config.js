import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import tailwind from "eslint-plugin-better-tailwindcss";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import storybook from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";

// What a React Router route module may export beside its component.
const ROUTE_EXPORTS = ["meta", "links", "headers", "loader", "clientLoader", "action", "clientAction", "ErrorBoundary", "HydrateFallback", "Layout", "handle", "shouldRevalidate"];

export default tseslint.config(
  { ignores: ["build", "storybook-static", ".react-router", "harness", "mockups", ".cache", "test-results", "playwright-report"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true, allowExportNames: ROUTE_EXPORTS }],
    },
  },
  ...storybook.configs["flat/recommended"],
  {
    // A story file exports its meta and stories, not components.
    files: ["**/*.stories.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Tailwind classes: spelled right, in one order, none doubled or fighting, and only the tokens app.css defines.
    files: ["app/**/*.{ts,tsx}", ".storybook/**/*.tsx"],
    plugins: { "better-tailwindcss": tailwind },
    settings: { "better-tailwindcss": { entryPoint: fileURLToPath(new URL("app/app.css", import.meta.url)) } },
    rules: {
      ...tailwind.configs["recommended-error"].rules,
      // No formatter wraps this repo's lines, so a class list stays on one line.
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      // An area's own CSS file defines classes the plugin can't see (it reads app.css alone): each area names its prefix here.
      "better-tailwindcss/no-unknown-classes": [
        "error",
        {
          ignore: [
            "^sh(-|$)",
            "^window(-|$)",
            "^alert(-|$)",
            "^app(-|$)",
            "^vw(-|$)",
            "^menubar(-|$)",
            "^rd(-|$)",
            "^ph(-|$)",
          ],
        },
      ],
    },
  },
  // Config files and scripts run on Node.
  { files: ["*.{js,ts}", "e2e/**/*.ts", "scripts/**/*.mjs"], languageOptions: { globals: globals.node } },
);
