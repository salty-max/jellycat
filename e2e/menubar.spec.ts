import { expect, test, type Page } from "@playwright/test";

// The desktop's menu bar (app/os/desktop/menubar): every menu and item, the keyboard, and Restart and Shut Down. For computers only.

test.skip(({ isMobile }) => isMobile, "the desktop's menu bar is for computers");

const win = (page: Page, name: string) => page.getByRole("dialog", { name });
const bar = (page: Page, name: string) => page.getByRole("menubar").getByRole("menuitem", { name, exact: true });
const pick = async (page: Page, menu: string, item: string, role: "menuitem" | "menuitemradio" | "menuitemcheckbox" = "menuitem") => {
  await bar(page, menu).click();
  await page.getByRole(role, { name: item, exact: true }).click();
};

async function boot(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
}

test("the cat menu: About names the OS, Control Panel opens its window", async ({ page }) => {
  await boot(page);
  await pick(page, "Jelly-OS", "About Jelly-OS");
  const about = page.getByRole("alertdialog", { name: "Jelly-OS 1.0" });
  await expect(about).toContainText("Jellycat Studio");
  await expect(about.getByRole("button", { name: "OK" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(about).toHaveCount(0);
  await pick(page, "Jelly-OS", "Control Panel");
  await expect(win(page, "Control Panel")).toBeVisible();
});

test("File: Open and Get Info act on the selected icon, Close Window on the front window", async ({ page }) => {
  await boot(page);
  await bar(page, "File").click();
  await expect(page.getByRole("menuitem", { name: "Open", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");

  await win(page, "Projects").getByRole("option", { name: "Web" }).click();
  await pick(page, "File", "Open");
  await expect(win(page, "Web")).toBeVisible();
  await win(page, "Web").getByRole("option", { name: /Hundo/ }).click();
  await pick(page, "File", "Get Info");
  await expect(win(page, "Hundo Info")).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/hundo$/);

  await pick(page, "File", "Close Window");
  await expect(win(page, "Hundo Info")).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
});

test("Edit is dim; View sets the front folder's view; Window lists the windows", async ({ page }) => {
  await boot(page);
  await bar(page, "Edit").click();
  for (const name of ["Undo", "Cut", "Copy", "Paste"])
    await expect(page.getByRole("menuitem", { name, exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");

  await pick(page, "View", "by Name", "menuitemradio");
  await expect(win(page, "Projects").getByText("by name")).toBeVisible();
  await pick(page, "View", "by Icon", "menuitemradio");
  await expect(win(page, "Projects").getByText("by icon")).toBeVisible();

  await pick(page, "Jelly-OS", "Control Panel");
  await bar(page, "Window").click();
  await expect(page.getByRole("menuitemradio", { name: "Control Panel" })).toBeChecked();
  await page.getByRole("menuitemradio", { name: "Projects" }).click();
  await expect(win(page, "Projects")).toHaveAttribute("data-active", "true");
});

test("Special: the phosphors, CRT effects and Dither change the page", async ({ page }) => {
  await boot(page);
  const html = page.locator("html");
  await pick(page, "Special", "Amber phosphor", "menuitemradio");
  await expect(html).toHaveAttribute("data-phosphor", "amber");
  await pick(page, "Special", "White phosphor", "menuitemradio");
  await expect(html).toHaveAttribute("data-phosphor", "white");
  await pick(page, "Special", "Green phosphor", "menuitemradio");
  await expect(html).toHaveAttribute("data-phosphor", "green");
  await pick(page, "Special", "CRT effects", "menuitemcheckbox");
  await expect(html).toHaveAttribute("data-scanlines", "false");
  await expect(html).toHaveAttribute("data-glow", "false");
  await pick(page, "Special", "CRT effects", "menuitemcheckbox");
  await expect(html).toHaveAttribute("data-scanlines", "true");
  await pick(page, "Special", "Dither pattern", "menuitemcheckbox");
  await expect(html).toHaveAttribute("data-dither", "false");
});

test("the keyboard opens a menu, Esc closes it, and hover moves between menus", async ({ page }) => {
  await boot(page);
  await bar(page, "File").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Close Window" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await bar(page, "File").click();
  await bar(page, "Special").hover();
  await expect(page.getByRole("menuitem", { name: "Restart" })).toBeVisible();
});

test("Restart closes the windows and boots again", async ({ page }) => {
  await boot(page);
  await pick(page, "Jelly-OS", "Control Panel");
  await pick(page, "Special", "Restart");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "boot");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
  await expect(win(page, "Control Panel")).toHaveCount(0);
  await expect(win(page, "Projects")).toBeVisible();
});

test("Shut Down... asks first, then shows the shut-down screen, and a click restarts", async ({ page }) => {
  await boot(page);
  await pick(page, "Special", "Shut Down...");
  const ask = page.getByRole("alertdialog", { name: "Shut down Jelly-OS?" });
  await ask.getByRole("button", { name: "Cancel" }).click();
  await expect(ask).toHaveCount(0);
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");

  await pick(page, "Special", "Shut Down...");
  await expect(ask.getByRole("button", { name: "Shut Down" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "off");
  await expect(page.getByText("Jelly-OS has shut down.")).toBeVisible();
  await page.getByRole("button", { name: /has shut down/ }).click();
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
  await expect(win(page, "Projects")).toBeVisible();
});
