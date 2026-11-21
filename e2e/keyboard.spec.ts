import { expect, test, type Locator, type Page } from "@playwright/test";

// The OS with no mouse: every app opened and closed from the keyboard alone, on the desktop and on the phone. Nothing here clicks.
// Focus moves only by the keys a visitor has (Tab, Shift+Tab, the arrows, Enter, Esc), so each step also proves that what it
// reaches is in the tab order.

const win = (page: Page, name: string) => page.getByRole("dialog", { name });

/** Presses Tab (Shift+Tab with `back`) until the target has the focus, and fails if it never does. */
async function tabTo(page: Page, target: Locator, { back = false, max = 60 } = {}) {
  for (let presses = 0; presses <= max; presses++) {
    if (await target.evaluate((element) => element === document.activeElement).catch(() => false)) return;
    await page.keyboard.press(back ? "Shift+Tab" : "Tab");
  }
  throw new Error(`${max} presses of ${back ? "Shift+Tab" : "Tab"} never reached ${target}`);
}

/** The name of what has the focus: its label (the cat menu is an icon), else its text. */
const focused = (page: Page) =>
  page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent?.trim() ?? "");

/** Presses a key and waits for the focus to move (the menus move it a moment after the key). */
async function step(page: Page, key: string) {
  const before = await focused(page);
  await page.keyboard.press(key);
  await expect.poll(() => focused(page)).not.toBe(before);
}

/** Opens a menu of the menu bar from the keyboard and picks an item: Tab to the bar, the arrows across and down, Enter. */
async function pick(page: Page, menu: string, item: string) {
  // The bar is one tab stop, on the menu last used.
  await tabTo(page, page.getByRole("menubar").locator('[role="menuitem"][tabindex="0"]'));
  for (let steps = 0; steps < 6 && (await focused(page)) !== menu; steps++) await step(page, "ArrowRight");
  expect(await focused(page)).toBe(menu);
  await step(page, "ArrowDown");
  for (let steps = 0; steps < 12 && (await focused(page)) !== item; steps++) await step(page, "ArrowDown");
  const exact = new RegExp(`^${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  await expect(page.getByRole("menu").locator('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]').filter({ hasText: exact })).toBeFocused();
  await page.keyboard.press("Enter");
}

test.describe("the desktop", () => {
  test.skip(({ isMobile }) => isMobile, "the desktop is for computers");

  test("every app opens and closes with no mouse", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");

    // Projects opens at boot with the focus on its first item; Enter opens a folder, then a project's Info window.
    await expect(win(page, "Projects").getByRole("option", { name: "Web" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(win(page, "Web").getByRole("option", { name: /Hundo/ })).toBeFocused();
    await page.keyboard.press("Enter");
    const info = win(page, "Hundo Info");
    await expect(info).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/hundo$/);

    // Enter in the Info window is Open Readme; Esc closes the README.
    await page.keyboard.press("Enter");
    const readme = win(page, "Hundo Readme");
    await expect(readme.getByRole("heading", { name: "Hundo" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(readme).toHaveCount(0);

    // View opens the screenshots; the arrows step, Esc closes.
    await tabTo(page, info.getByRole("button", { name: "View" }));
    await page.keyboard.press("Enter");
    const viewer = win(page, "Hundo Screenshots");
    await expect(viewer.getByText("1 of 3")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByText("2 of 3")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);

    // A window's Close box, reached with Shift+Tab, closes it; closing the Info window takes the address back to the desktop.
    await tabTo(page, info.getByRole("button", { name: "Close" }), { back: true });
    await page.keyboard.press("Enter");
    await expect(info).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);

    // File > Close Window closes the window in front.
    await tabTo(page, win(page, "Web").getByRole("option", { name: /Hundo/ }));
    await pick(page, "File", "Close Window");
    await expect(win(page, "Web")).toHaveCount(0);

    // The desktop's icons: Jelly HD holds the studio's Readme, the Terminal and the Control Panel.
    await tabTo(page, page.getByRole("listbox", { name: "Desktop" }).getByRole("option", { name: "Jelly HD" }));
    await page.keyboard.press("Enter");
    const hd = win(page, "Jelly HD");
    await expect(hd.getByRole("option", { name: "Projects" })).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const studio = win(page, "Readme");
    await expect(studio.getByRole("link", { name: "max@jellycat.fr" })).toBeVisible();
    await tabTo(page, studio.getByRole("button", { name: "Close" }), { back: true });
    await page.keyboard.press("Enter");
    await expect(studio).toHaveCount(0);

    // The Terminal takes the focus at its prompt; on an empty line Shift+Tab leaves it, for its Close box.
    await tabTo(page, hd.getByRole("option", { name: "Readme" }));
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const terminal = win(page, "Terminal");
    const input = terminal.getByLabel("Terminal input");
    await expect(input).toBeFocused();
    await page.keyboard.type("ls");
    await page.keyboard.press("Enter");
    await expect(terminal.getByRole("button", { name: /^projects/ })).toBeVisible();
    await tabTo(page, terminal.getByRole("button", { name: "Close" }), { back: true });
    await page.keyboard.press("Enter");
    await expect(terminal).toHaveCount(0);

    // The Control Panel: the arrows pick a phosphor.
    await tabTo(page, hd.getByRole("option", { name: "Terminal" }));
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const panel = win(page, "Control Panel");
    await tabTo(page, panel.getByRole("radio", { name: "Green" }));
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("html")).toHaveAttribute("data-phosphor", "amber");
    await page.keyboard.press("ArrowUp");
    await expect(page.locator("html")).toHaveAttribute("data-phosphor", "green");
    await tabTo(page, panel.getByRole("button", { name: "Close" }), { back: true });
    await page.keyboard.press("Enter");
    await expect(panel).toHaveCount(0);

    await tabTo(page, hd.getByRole("button", { name: "Close" }), { back: true });
    await page.keyboard.press("Enter");
    await expect(hd).toHaveCount(0);

    // The Trash, at the bottom of the icons.
    await tabTo(page, page.getByRole("listbox", { name: "Desktop" }).getByRole("option", { name: "Jelly HD" }));
    await page.keyboard.press("End");
    await expect(page.getByRole("option", { name: "Trash" })).toBeFocused();
    await page.keyboard.press("Enter");
    const trash = win(page, "Trash");
    await expect(trash.getByText("0 items")).toBeVisible();
    await tabTo(page, trash.getByRole("button", { name: "Close" }), { back: true });
    await page.keyboard.press("Enter");
    await expect(trash).toHaveCount(0);

    // The menu bar's dialogs: About closes on Enter (OK), Shut Down... on Esc (Cancel), then shuts down on Enter.
    await pick(page, "Jelly-OS", "About Jelly-OS");
    const about = page.getByRole("alertdialog", { name: "Jelly-OS 1.0" });
    await expect(about.getByRole("button", { name: "OK" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(about).toHaveCount(0);

    await pick(page, "Special", "Shut Down...");
    const ask = page.getByRole("alertdialog", { name: "Shut down Jelly-OS?" });
    await expect(ask.getByRole("button", { name: "Shut Down" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(ask).toHaveCount(0);
    await pick(page, "Special", "Shut Down...");
    await expect(ask.getByRole("button", { name: "Shut Down" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "off");
    // The shut-down screen is one button: Tab reaches it, Enter restarts.
    await tabTo(page, page.getByRole("button", { name: /has shut down/ }));
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
    await expect(win(page, "Projects")).toBeVisible();
  });
});

test.describe("the phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone's page");

  test("a project, the viewer and the Control Panel's sheet work with no pointer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "phone");

    // A folder tab, then a card's link: Enter follows each.
    await tabTo(page, page.getByRole("navigation", { name: "Folders" }).getByRole("link", { name: /Engines/ }));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/#engines$/);
    await tabTo(page, page.getByRole("link", { name: "Gero", exact: true }));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/projects\/gero$/);
    await expect(page.getByRole("heading", { level: 1, name: "Gero" })).toBeVisible();

    // A picture opens the viewer, with the focus on Close; the arrows step, Esc closes and gives the focus back to the picture.
    const picture = page.getByRole("region", { name: /Screenshots/ }).getByRole("button").first();
    await tabTo(page, picture);
    await page.keyboard.press("Enter");
    const viewer = page.getByRole("dialog", { name: "Gero screenshots" });
    await expect(viewer.getByRole("button", { name: "Close" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByRole("status")).toHaveText("2 of 2");
    await page.keyboard.press("ArrowLeft");
    await expect(viewer.getByRole("status")).toHaveText("1 of 2");
    // Tab stays inside it: round its three buttons (and, past the last, the browser's own controls), never to the page behind.
    for (let presses = 0; presses < 5; presses++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest("dialog"))).toBe(true);
    }
    await tabTo(page, viewer.getByRole("button", { name: "Close" }));
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(picture).toBeFocused();

    // The header's button opens the sheet with the focus on the checked phosphor; the arrows pick one, Space an effect.
    const button = page.getByRole("button", { name: "Control Panel" });
    await tabTo(page, button, { back: true });
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: "Control Panel" });
    await expect(sheet.getByRole("radio", { name: "Green" })).toBeFocused();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("html")).toHaveAttribute("data-phosphor", "amber");
    await tabTo(page, sheet.getByRole("checkbox", { name: "Glow" }));
    await page.keyboard.press("Space");
    await expect(page.locator("html")).toHaveAttribute("data-glow", "false");
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("aria-expanded", "false");

    // The close box closes it too.
    await page.keyboard.press("Enter");
    await tabTo(page, sheet.getByRole("button", { name: "Close" }), { back: true });
    await page.keyboard.press("Enter");
    await expect(sheet).toHaveCount(0);
    await expect(button).toBeFocused();
  });
});

test("404.html: Tab reaches the way home", async ({ page }, info) => {
  await page.goto("/no/such/page");
  await tabTo(page, page.getByRole("link", { name: "Go to the home page" }));
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", info.project.name === "phone" ? "phone" : "desktop");
});
