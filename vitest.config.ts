import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Tests don't load vite.config.ts: React Router's plugin builds the whole app and doesn't run under Vitest, so components are
// tested with the plain React plugin.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./app/test-setup.ts"],
    include: ["app/**/*.test.{ts,tsx}"],
  },
});
