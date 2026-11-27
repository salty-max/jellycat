import { expect, test } from "@playwright/test";
import { BRAND_MARK } from "../app/brand/art";
import { DEFAULT_SETTINGS, SETTINGS_KEY, SETTINGS_VERSION } from "../app/core/settings";

test("the generated browser icons are served as assets and named in the head", async ({ request }) => {
  const html = await (await request.get("/")).text();
  for (const path of ["/brand/favicon.svg", "/favicon.ico", "/apple-touch-icon.png", "/site.webmanifest"]) {
    expect(html).toContain(`href="${path}"`);
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).not.toContain("text/html");
  }
  const svg = await (await request.get("/brand/favicon.svg")).text();
  expect(svg).toContain(BRAND_MARK.foreground);
});

for (const [phosphor, ink, paper] of [
  ["green", "rgb(51, 255, 102)", "rgb(3, 18, 8)"],
  ["amber", "rgb(255, 176, 0)", "rgb(20, 11, 0)"],
  ["white", "rgb(232, 238, 248)", "rgb(11, 13, 18)"],
] as const) {
  test(`the approved mark follows the ${phosphor} screen`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(({ key, version, state }) => localStorage.setItem(key, JSON.stringify({ version, state })), { key: SETTINGS_KEY, version: SETTINGS_VERSION, state: { ...DEFAULT_SETTINGS, phosphor } });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-phosphor", phosphor);
    const mark = page.locator('[data-brand-mark="jellycat"]:visible').first();
    await expect(mark).toBeVisible();
    await expect(mark).toHaveAttribute("viewBox", BRAND_MARK.viewBox);
    await expect(mark.locator("path").nth(0)).toHaveCSS("fill", paper);
    await expect(mark.locator("path").nth(1)).toHaveCSS("fill", ink);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: info.outputPath(`branding-${phosphor}.png`), scale: "css" });
  });
}
