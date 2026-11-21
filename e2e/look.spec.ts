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
  // Hydrated: the layout has left the server's "unknown" for the phone's page or the desktop.
  await expect(page.locator("[data-layout]")).not.toHaveAttribute("data-layout", "unknown");
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

test("a phosphor and an effect chosen in the phone's sheet hold after a reload, on the phone and then on the desktop", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the phone's sheet");
  await page.goto("/");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "phone");
  await page.getByRole("button", { name: "Control Panel" }).tap();
  const sheet = page.getByRole("dialog", { name: "Control Panel" });
  await sheet.getByRole("radio", { name: "White" }).tap();
  await sheet.getByRole("checkbox", { name: "Scanlines" }).tap();
  await sheet.getByRole("button", { name: "Close" }).tap();
  await expect(sheet).toHaveCount(0);

  await page.reload();
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-phosphor", "white");
  await expect(html).toHaveAttribute("data-scanlines", "false");
  await page.getByRole("button", { name: "Control Panel" }).tap();
  await expect(sheet.getByRole("radio", { name: "White" })).toBeChecked();
  await expect(sheet.getByRole("checkbox", { name: "Scanlines" })).not.toBeChecked();
  await sheet.getByRole("button", { name: "Close" }).tap();

  // The same screen made wide: the desktop's Control Panel shows the same choices.
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
  await expect(html).toHaveAttribute("data-phosphor", "white");
  await page.getByRole("option", { name: "Jelly HD" }).dblclick();
  await page.getByRole("dialog", { name: "Jelly HD" }).getByRole("option", { name: "Control Panel" }).dblclick();
  const panel = page.getByRole("dialog", { name: "Control Panel" });
  await expect(panel.getByRole("radio", { name: "White" })).toBeChecked();
  await expect(panel.getByRole("checkbox", { name: "Scanlines" })).not.toBeChecked();
});

test("when the sheet's code can't be loaded, the button goes back to closed, and the next press tries again", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the phone's sheet");
  const chunk = /\/assets\/control-panel-sheet-[^/]+\.js$/;
  await page.route(chunk, (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "phone");
  const button = page.getByRole("button", { name: "Control Panel" });
  await button.tap();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.unroute(chunk);
  await button.tap();
  await expect(page.getByRole("dialog", { name: "Control Panel" })).toBeVisible();
});
