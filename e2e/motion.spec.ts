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

// Phase 2's additions bring no motion of their own, with reduced motion or without (the flicker, off by default, is the CRT's):
// the Lab running a program, the Contact window and the Control Panel's Sound row, or on the phone the contact page and the
// sheet, start no CSS animation or transition. An init script counts each one that starts, so a short transition that is over
// by the time the test looks still counts.
for (const reduced of [true, false]) {
  test.describe(`Phase 2's windows ${reduced ? "with" : "without"} reduced motion`, () => {
    test.use({ reducedMotion: reduced ? "reduce" : "no-preference" });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        const seen: string[] = [];
        (window as unknown as { motionSeen: string[] }).motionSeen = seen;
        for (const type of ["animationstart", "transitionrun"])
          document.addEventListener(type, (event) => seen.push(`${type} ${(event.target as Element).className}`), true);
      });
    });
    const started = (page: Page) => page.evaluate(() => (window as unknown as { motionSeen: string[] }).motionSeen);

    test("the desktop's Lab, Contact and Control Panel start none", async ({ page, isMobile }) => {
      test.skip(isMobile, "the desktop's windows");
      await page.goto("/");
      await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
      // The boot screen's own wait is the desktop's (see above): counted from here.
      await page.evaluate(() => ((window as unknown as { motionSeen: string[] }).motionSeen.length = 0));
      await page.getByRole("option", { name: "Jelly HD" }).press("Enter");
      const hd = page.getByRole("dialog", { name: "Jelly HD" });
      await hd.getByRole("option", { name: "Lab" }).press("Enter");
      const lab = page.getByRole("dialog", { name: "Lab" });
      // Run does nothing until the programs have come: wait for the editor to hold fizzbuzz, as lab.spec does.
      await expect(lab.getByRole("textbox", { name: "Program" })).toHaveValue(/^-- fizzbuzz\.gr/);
      await lab.getByRole("button", { name: "Run" }).press("Enter");
      await expect(lab.getByRole("status")).toHaveText("halted, 1076 steps");
      await hd.getByRole("option", { name: "Contact" }).press("Enter");
      await expect(page.getByRole("dialog", { name: "Contact" }).getByLabel("Name")).toBeFocused();
      await hd.getByRole("option", { name: "Control Panel" }).press("Enter");
      const sound = page.getByRole("dialog", { name: "Control Panel" }).getByRole("checkbox", { name: "On" });
      await sound.press("Space");
      await expect(sound).toBeChecked();
      expect(await started(page)).toEqual([]);
    });

    test("the phone's contact page and sheet start none", async ({ page, isMobile }) => {
      test.skip(!isMobile, "the phone's page");
      await page.goto("/contact");
      await expect(layout(page)).toHaveAttribute("data-layout", "phone");
      await page.getByRole("button", { name: "Control Panel" }).press("Enter");
      const sound = page.getByRole("dialog", { name: "Control Panel" }).getByRole("checkbox", { name: "On" });
      await sound.press("Space");
      await expect(sound).toBeChecked();
      expect(await started(page)).toEqual([]);
    });
  });
}
