import { expect, test } from "@playwright/test";

const KEY = "jelly-os:settings";

test("a saved amber setting paints amber from the first paint, with no hydration error", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  const saved = { phosphor: "amber", scanlines: false, glow: true, flicker: false, dither: true };
  await page.addInitScript(
    ([key, state]) => {
      localStorage.setItem(key, JSON.stringify({ state, version: 1 }));
      // What the page shows at its first paint, read before any React code runs: the head script must already have set it.
      document.addEventListener("DOMContentLoaded", () => {
        (window as unknown as { first: string }).first = `${document.documentElement.dataset.phosphor} ${getComputedStyle(document.body).color}`;
      });
    },
    [KEY, saved] as const,
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Jelly-OS 1.0" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-phosphor", "amber");
  await expect(html).toHaveAttribute("data-scanlines", "false");
  expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe("rgb(255, 176, 0)");
  expect(await page.evaluate(() => (window as unknown as { first: string }).first)).toBe("amber rgb(255, 176, 0)");
  expect(errors).toEqual([]);
});

test("a first visit is green with the full tube, and the font is preloaded", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-phosphor", "green");
  await expect(html).toHaveAttribute("data-flicker", "false");
  const preload = page.locator('link[rel="preload"][as="font"][type="font/woff2"]');
  await expect(preload).toHaveAttribute("href", /vt323-latin-400-normal.*\.woff2$/);
  await expect(preload).toHaveAttribute("crossorigin", "anonymous");
});
