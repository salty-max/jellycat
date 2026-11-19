import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the production build, served the way Vercel serves it (scripts/serve.mjs: static files, and 404.html
// with a 404 status for anything else). They drive the system Chrome, here and on GitHub's runner, so nothing downloads a browser.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173" },
  webServer: { command: "pnpm build && pnpm preview", url: "http://localhost:4173", reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
});
