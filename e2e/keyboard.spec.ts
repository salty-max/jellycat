import { expect, test, type Locator, type Page } from "@playwright/test";

// The OS with no mouse: every app opened and closed from the keyboard alone, on the desktop and in the shell. Nothing here clicks.
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
    await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", "desktop");

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
    await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", "off");
    // The shut-down screen is one button: Tab reaches it, Enter restarts.
    await tabTo(page, page.getByRole("button", { name: /has shut down/ }));
    await page.keyboard.press("Enter");
    await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", "desktop");
    await expect(win(page, "Projects")).toBeVisible();
  });
});

test.describe("the shell", () => {
  test.skip(({ isMobile }) => !isMobile, "the shell is the phone's");

  test("every view opens and closes with no mouse, and Tab leaves the prompt", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", "shell");
    const input = page.getByLabel("Terminal input");
    const run = async (line: string) => {
      await page.keyboard.type(line);
      await page.keyboard.press("Enter");
    };

    // The welcome's names come first, then the prompt.
    await tabTo(page, input);
    await run("help");
    await expect(page.getByRole("log").getByText("browse")).not.toHaveCount(0);

    // open: the project's card and its address; the README row pages it, q comes back.
    await run("open hundo");
    await expect(page).toHaveURL(/\/projects\/hundo$/);
    const path = page.getByRole("button", { name: "~/projects/web/hundo/README" }).last();
    await tabTo(page, path, { back: true });
    await page.keyboard.press("Enter");
    const pager = page.getByRole("region", { name: "~/projects/web/hundo/README" });
    await expect(pager.getByRole("heading", { name: "Hundo" })).toBeVisible();
    await page.keyboard.press("j");
    await page.keyboard.press("q");
    await expect(pager).toHaveCount(0);

    // view: the screenshots full screen; l steps, q comes back.
    await tabTo(page, input);
    await run("view hundo");
    await expect(page.getByText("1 of 3")).toBeVisible();
    await page.keyboard.press("l");
    await expect(page.getByText("2 of 3")).toBeVisible();
    await page.keyboard.press("q");
    await expect(page.getByText("2 of 3")).toHaveCount(0);

    // browse: Enter goes into a directory, q comes back to the prompt.
    await run("browse");
    const directory = page.getByRole("group", { name: "Directory" });
    await expect(directory.getByRole("button", { name: "projects/" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(directory.getByRole("button", { name: "web/" })).toBeVisible();
    await page.keyboard.press("q");
    await expect(directory).toHaveCount(0);
    await expect(input).toBeFocused();

    // A name in a listing is a link: Shift+Tab from an empty prompt reaches it, Enter opens the project.
    await run("ls ~/projects/web");
    await tabTo(page, page.getByRole("link", { name: "farseer/" }).last(), { back: true });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/projects\/farseer$/);
  });
});

test("404.html: Tab reaches the way home", async ({ page }, info) => {
  await page.goto("/no/such/page");
  await tabTo(page, page.getByRole("link", { name: "Go to the home page" }));
  await page.keyboard.press("Enter");
  await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", info.project.name === "phone" ? "shell" : "desktop");
});
