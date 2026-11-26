import { expect, test, type Page } from "@playwright/test";

// prefers-reduced-motion: the desktop's boot screen doesn't wait its 1.3s, the Terminal's typed login doesn't play, and the CRT's
// flicker never runs (on the phone's page too). Each check runs with the setting and without it, so it also shows the motion is there when allowed.

const layout = (page: Page) => page.locator("[data-layout]");

for (const reduced of [true, false]) {
  const name = reduced ? "with reduced motion" : "without reduced motion";

  test.describe(name, () => {
    test.use({ reducedMotion: reduced ? "reduce" : "no-preference" });

    test(`the boot screen ${reduced ? "goes as soon as the desktop is ready" : "stays 1.3s"}`, async ({ page, isMobile }) => {
      test.skip(isMobile, "the boot screen is the desktop's");
      // The page's clock is paused from the start, so no timer of the boot fires on its own; the desktop's code still loads.
      // `install` starts the clock running from its time, so by the next line it is already past it: pausing at the same instant is a time in the past, and fails now and then. An hour later is always ahead.
      await page.clock.install({ time: new Date("2026-11-20T18:30:00") });
      await page.clock.pauseAt(new Date("2026-11-20T19:30:00"));
      await page.goto("/");
      await expect(layout(page)).toHaveAttribute("data-layout", "boot");
      await page.waitForLoadState("networkidle");
      await page.clock.runFor(1);
      if (reduced) {
        await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
      } else {
        await page.clock.runFor(1000);
        await expect(layout(page)).toHaveAttribute("data-layout", "boot");
        await page.clock.runFor(400);
        await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
      }
    });

    test(`the typed login ${reduced ? "doesn't play" : "plays"} on logout`, async ({ page, isMobile }) => {
      test.skip(isMobile, "the shell is the desktop's Terminal");
      await page.goto("/");
      await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
      await page.getByRole("option", { name: "Terminal" }).dblclick();
      // When each login line first shows (the user name typed one letter at a time, then "Last login"), by the page's clock.
      await page.evaluate(() => {
        const seen: Record<string, number> = {};
        (window as unknown as { loginLines: Record<string, number> }).loginLines = seen;
        new MutationObserver(() => {
          for (const line of document.querySelectorAll('[role="log"] div')) {
            const text = line.textContent ?? "";
            if ((text.startsWith("jellycat login:") || text.startsWith("Last login:")) && !(text in seen)) seen[text] = performance.now();
          }
        }).observe(document.querySelector('[role="log"]')!, { childList: true, subtree: true, characterData: true });
      });
      const input = page.getByLabel("Terminal input");
      await input.fill("logout");
      await input.press("Enter");
      await expect(page.getByText(/^Last login: /)).toBeVisible();
      const seen = await page.evaluate(() => (window as unknown as { loginLines: Record<string, number> }).loginLines);
      const times = Object.values(seen);
      const span = Math.max(...times) - Math.min(...times);
      // The login's own pauses add up to 1.6s, 1.1s of them between its first line and "Last login": reduced, it's all at once.
      if (reduced) expect(span).toBeLessThan(250);
      else expect(span).toBeGreaterThan(1000);
    });

    test(`the flicker ${reduced ? "never runs" : "runs when it's on"}`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("jelly-os:settings", JSON.stringify({ state: { flicker: true }, version: 1 })));
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-flicker", "true");
      // Hydrated: one layout's CRT layer left, the phone's page's or the tube's.
      await expect(layout(page)).not.toHaveAttribute("data-layout", "unknown");
      const flicker = page.locator(".crt-flicker");
      await expect(flicker).toHaveCSS("animation-name", reduced ? "none" : "crt-flicker");
      await expect(flicker).toHaveCSS("display", reduced ? "none" : "block");
    });
  });
}
