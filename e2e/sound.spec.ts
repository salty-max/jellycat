import { expect, test, type Locator, type Page } from "@playwright/test";

// Sound (app/os/sound): off by default, saved with the other settings, and no AudioContext before a click or a key, on both layouts.

const KEY = "jelly-os:settings";

/** Counts the AudioContexts the page makes, before any of its code runs. */
async function countContexts(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { audioContexts: number; AudioContext: typeof AudioContext };
    w.audioContexts = 0;
    const Original = w.AudioContext;
    w.AudioContext = class extends Original {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args);
        w.audioContexts++;
      }
    };
  });
}
/** A click on the bare page: it must not be a link, or the test would be proving nothing on another page. */
async function click(page: Page) {
  const url = page.url();
  await page.mouse.click(5, 300);
  expect(page.url()).toBe(url);
}
const contexts = (page: Page) => page.evaluate(() => (window as unknown as { audioContexts: number }).audioContexts);
const saved = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null")?.state?.sound as boolean | undefined, KEY);

async function boot(page: Page, isMobile: boolean) {
  await page.goto("/");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", isMobile ? "phone" : "desktop");
  await page.waitForLoadState("networkidle");
}

/** The Control Panel's panel (the desktop's window) or sheet (the phone's), open. */
async function openPanel(page: Page, isMobile: boolean): Promise<Locator> {
  if (isMobile) {
    await page.getByRole("button", { name: "Control Panel" }).tap();
  } else {
    await page.getByRole("option", { name: "Jelly HD" }).dblclick();
    await page.getByRole("dialog", { name: "Jelly HD" }).getByRole("option", { name: "Control Panel" }).dblclick();
  }
  const panel = page.getByRole("dialog", { name: "Control Panel" });
  await expect(panel).toBeVisible();
  return panel;
}

test("sound is off by default: the row says so, and a page used with it off never makes an audio context", async ({ page, isMobile }) => {
  await countContexts(page);
  await boot(page, isMobile);
  const panel = await openPanel(page, isMobile);
  await expect(panel.getByRole("checkbox", { name: "On" })).not.toBeChecked();
  await click(page);
  await page.keyboard.press("Tab");
  expect(await contexts(page)).toBe(0);
  expect(await saved(page)).toBeUndefined();
});

test("turning it on makes one audio context, in that click, and is saved; a reload makes none until the first click or key", async ({ page, isMobile }) => {
  await countContexts(page);
  await boot(page, isMobile);
  const panel = await openPanel(page, isMobile);
  const on = panel.getByRole("checkbox", { name: "On" });
  await (isMobile ? on.tap() : on.click());
  await expect(on).toBeChecked();
  await expect.poll(() => contexts(page)).toBe(1);
  expect(await saved(page)).toBe(true);

  await page.reload();
  await boot(page, isMobile);
  expect(await saved(page)).toBe(true);
  expect(await contexts(page)).toBe(0);
  // Still silent after a while.
  await page.waitForTimeout(500);
  expect(await contexts(page)).toBe(0);
  await click(page);
  await expect.poll(() => contexts(page)).toBe(1);
  const reopened = await openPanel(page, isMobile);
  await expect(reopened.getByRole("checkbox", { name: "On" })).toBeChecked();
});

test("with sound saved on, a key is the first gesture too", async ({ page, isMobile }) => {
  await countContexts(page);
  await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify({ state: { sound: true }, version: 1 })), KEY);
  await boot(page, isMobile);
  expect(await contexts(page)).toBe(0);
  await page.keyboard.press("Tab");
  await expect.poll(() => contexts(page)).toBe(1);
});

test("turning it off again is saved, and later clicks make no other context", async ({ page, isMobile }) => {
  await countContexts(page);
  await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify({ state: { sound: true }, version: 1 })), KEY);
  await boot(page, isMobile);
  const panel = await openPanel(page, isMobile);
  const on = panel.getByRole("checkbox", { name: "On" });
  await expect(on).toBeChecked();
  await expect.poll(() => contexts(page)).toBe(1);
  await (isMobile ? on.tap() : on.click());
  await expect(on).not.toBeChecked();
  expect(await saved(page)).toBe(false);
  await click(page);
  expect(await contexts(page)).toBe(1);
});

test("Special's Sound item switches it, on the desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "the menu bar is the desktop's");
  await countContexts(page);
  await boot(page, false);
  await page.getByRole("menubar").getByRole("menuitem", { name: "Special", exact: true }).click();
  const item = page.getByRole("menuitemcheckbox", { name: "Sound", exact: true });
  await expect(item).not.toBeChecked();
  await item.click();
  await expect.poll(() => saved(page)).toBe(true);
  await expect.poll(() => contexts(page)).toBe(1);
});
