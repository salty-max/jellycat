import { expect, test, type Page } from "@playwright/test";

// Visible focus everywhere: on each main screen, Tab goes round every stop, and each stop must look different focused and not. The
// test compares pixels, not styles, so a ring that's there but drawn the same as the unfocused state (or hidden) fails. The Terminal's
// input is 1px and clear: its focus is the prompt's cursor, solid when focused and hollow when not, so the prompt is compared.

type Stop = { name: string; changed: boolean };

async function stops(page: Page): Promise<Stop[]> {
  const seen = new Set<string>();
  const found: Stop[] = [];
  for (let presses = 0; presses < 80; presses++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      // A modal's focus guards (Base UI's invisible spans) only hand the focus on; blurring one would break the trap.
      if (!element || element === document.body || element.hasAttribute("data-base-ui-focus-guard")) return null;
      element.dataset.focusStop ??= String(document.querySelectorAll("[data-focus-stop]").length);
      // The input shows its focus in the prompt it sits under, a phone's card around the whole card.
      const shown = element.matches(".sh-input") ? (element.closest(".sh")?.querySelector(".sh-term") as HTMLElement) : (element.closest<HTMLElement>(".ph-card") ?? element);
      const box = shown.getBoundingClientRect();
      const label = element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40) ?? "";
      return { id: element.dataset.focusStop, name: `${element.getAttribute("role") ?? element.tagName.toLowerCase()} "${label}"`, box: { x: box.x, y: box.y, width: box.width, height: box.height } };
    });
    if (!stop) continue;
    if (seen.has(stop.id)) break;
    seen.add(stop.id);
    const viewport = page.viewportSize()!;
    // The ring sits up to 5px outside the box (a card's is 4px off it).
    const x = Math.max(0, stop.box.x - 6);
    const y = Math.max(0, stop.box.y - 6);
    const clip = { x, y, width: Math.min(viewport.width - x, stop.box.width + 12), height: Math.min(viewport.height - y, stop.box.height + 12) };
    if (clip.width <= 0 || clip.height <= 0) {
      found.push({ name: stop.name, changed: false });
      continue;
    }
    const focused = await page.screenshot({ clip });
    await page.evaluate((id) => (document.querySelector(`[data-focus-stop="${id}"]`) as HTMLElement).blur(), stop.id);
    const blurred = await page.screenshot({ clip });
    await page.evaluate((id) => (document.querySelector(`[data-focus-stop="${id}"]`) as HTMLElement).focus({ preventScroll: true }), stop.id);
    found.push({ name: stop.name, changed: !focused.equals(blurred) });
  }
  return found;
}

async function expectEveryStopShown(page: Page, least: number) {
  const found = await stops(page);
  expect(found.length).toBeGreaterThanOrEqual(least);
  expect(found.filter((stop) => !stop.changed).map((stop) => stop.name)).toEqual([]);
}

test.describe("the phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone's page");
  test.use({ reducedMotion: "reduce" });

  test("the home page and a project page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "phone");
    // The header's two, the contact's two, the four tabs and a card a project.
    await expectEveryStopShown(page, 27);
    await page.goto("/projects/hundo");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "phone");
    // The header's two, the back link, the two addresses, three pictures, the README's link and Next.
    await expectEveryStopShown(page, 10);
  });

  test("the viewer and the Control Panel's sheet", async ({ page }) => {
    await page.goto("/projects/hundo");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "phone");
    await page.getByRole("region", { name: /Screenshots/ }).getByRole("button").first().press("Enter");
    // Close takes the focus a frame after the dialog opens: the round starts from there.
    await expect(page.getByRole("dialog", { name: "Hundo screenshots" }).getByRole("button", { name: "Close" })).toBeFocused();
    await expectEveryStopShown(page, 3);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Control Panel" }).press("Enter");
    const sheet = page.getByRole("dialog", { name: "Control Panel" });
    await expect(sheet.getByRole("radio", { name: "Green" })).toBeFocused();
    // The round starts at the close box, the first stop, so it goes on to the checked phosphor (a radio group is one stop) and the
    // three effects; past the last, the browser's own controls, then the close box again.
    await sheet.getByRole("button", { name: "Close" }).focus();
    await expectEveryStopShown(page, 5);
  });
});

test.describe("the desktop", () => {
  test.skip(({ isMobile }) => isMobile, "the desktop is for computers");
  test.use({ reducedMotion: "reduce" });

  test("the desktop, a project's Info window, its README and its screenshots", async ({ page }) => {
    await page.goto("/projects/hundo");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
    await page.getByRole("dialog", { name: "Hundo Info" }).getByRole("button", { name: "Open Readme" }).press("Enter");
    await expect(page.getByRole("dialog", { name: "Hundo Readme" }).getByRole("heading", { name: "Hundo" })).toBeVisible();
    await page.getByRole("dialog", { name: "Hundo Info" }).getByRole("button", { name: "View" }).press("Enter");
    await expect(page.getByRole("dialog", { name: "Hundo Screenshots" })).toBeVisible();
    await expectEveryStopShown(page, 20);
  });

  test("the Control Panel, the Terminal and the folders by name", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
    await page.getByRole("option", { name: "Jelly HD" }).press("Enter");
    const hd = page.getByRole("dialog", { name: "Jelly HD" });
    await hd.getByRole("option", { name: "Control Panel" }).press("Enter");
    await hd.getByRole("option", { name: "Terminal" }).press("Enter");
    await page.getByRole("menubar").getByRole("menuitem", { name: "View", exact: true }).press("Enter");
    await page.getByRole("menuitemradio", { name: "by Name" }).press("Enter");
    await expectEveryStopShown(page, 20);
  });

  test("the About and Shut Down dialogs", async ({ page }) => {
    // A modal alert keeps the focus on its buttons (Base UI's guards hand it back); blurring one there and going on with Tab would
    // break that trap, so its buttons are shot before and after one Tab, each move waited for.
    await page.goto("/");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
    for (const [menu, item, name, buttons] of [
      ["Jelly-OS", "About Jelly-OS", "Jelly-OS 1.0", ["OK"]],
      ["Special", "Shut Down...", "Shut down Jelly-OS?", ["Shut Down", "Cancel"]],
    ] as const) {
      await page.getByRole("menubar").getByRole("menuitem", { name: menu, exact: true }).press("Enter");
      await page.getByRole("menuitem", { name: item }).press("Enter");
      const dialog = page.getByRole("alertdialog", { name });
      const boxes = dialog.getByRole("button");
      // Every button's box, shot with the focus on the default button, then on the next one (or, alone, on none).
      const shots = async () =>
        Promise.all(
          buttons.map(async (button) => {
            const box = (await dialog.getByRole("button", { name: button }).boundingBox())!;
            return page.screenshot({ clip: { x: box.x - 4, y: box.y - 4, width: box.width + 8, height: box.height + 8 } });
          }),
        );
      await expect(dialog.getByRole("button", { name: buttons[0] })).toBeFocused();
      await expect(boxes).toHaveCount(buttons.length);
      const first = await shots();
      if (buttons.length > 1) {
        await page.keyboard.press("Tab");
        await expect(dialog.getByRole("button", { name: buttons[1] })).toBeFocused();
      } else await dialog.getByRole("button", { name: buttons[0] }).evaluate((element) => (element as HTMLElement).blur());
      const second = await shots();
      // The default button loses its focus ring; the other one, if any, gains one.
      for (const [index, button] of buttons.entries()) expect(first[index].equals(second[index]), `${button}'s focus shows`).toBe(false);
      await dialog.getByRole("button", { name: buttons.at(-1) }).press("Escape");
      await expect(dialog).toHaveCount(0);
    }
  });
});

test("404.html", async ({ page }) => {
  await page.goto("/no/such/page");
  await expectEveryStopShown(page, 1);
});
