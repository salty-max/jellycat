import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the production build, served the way Vercel serves it (scripts/serve.mjs: static files, and 404.html
// with a 404 status for anything else). They drive the system Chrome, here and on GitHub's runner, so nothing downloads a browser.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  // Each run serves its own build on 127.0.0.1, asks only that address, and waits for its own server to say it's listening, never
  // for whatever answers on the port: that may be another worktree's run, or another project's `vite preview` (4173 too). A server
  // already on that address makes serve.mjs exit, and the run fails once the build is done. One on `::1` or on every address can't
  // take this run's requests (macOS lets the more specific bind win; Linux refuses the bind).
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "pnpm build && pnpm preview",
    env: { SERVE_HOST: "127.0.0.1" },
    wait: { stdout: /^build\/client on http:\/\/127\.0\.0\.1:4173$/m },
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
});
