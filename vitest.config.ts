import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const PHOSPHORS = ["green", "amber", "white"] as const;

// Each story runs in the system Chrome, once per phosphor, and axe fails the run (preview.tsx sets parameters.a11y.test to "error").
const storyProject = (phosphor: (typeof PHOSPHORS)[number]) => ({
  extends: false as const,
  // Named here so Vite never finds them mid-run and reloads the page under a test.
  optimizeDeps: { include: ["zustand", "zustand/middleware", "@testing-library/react", "@base-ui/react/alert-dialog", "@base-ui/react/checkbox", "@base-ui/react/radio", "@base-ui/react/radio-group"] },
  plugins: [react(), storybookTest({ configDir: ".storybook", initialGlobals: { phosphor } })],
  test: {
    name: `stories:${phosphor}`,
    setupFiles: ["./app/test-setup-stories.ts"],
    browser: { enabled: true, headless: true, provider: playwright({ launchOptions: { channel: "chrome" } }), instances: [{ browser: "chromium" as const }] },
  },
});

export default defineConfig({
  test: {
    projects: [
      {
        // Tests don't load vite.config.ts: React Router's plugin builds the whole app and doesn't run under Vitest, so components are
        // tested with the plain React plugin.
                plugins: [react()],
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./app/test-setup.ts"],
          include: ["app/**/*.test.{ts,tsx}"],
        },
      },
      ...PHOSPHORS.map(storyProject),
    ],
  },
});
