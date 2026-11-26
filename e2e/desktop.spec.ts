import { expect, test, type Page } from "@playwright/test";

// The desktop's apps (app/os/desktop/apps): the folders, a project's Info window and its README, the Control Panel and the Terminal,
// and the address that follows them. The desktop is for computers: the phone project skips these.

test.skip(({ isMobile }) => isMobile, "the desktop's windows are for computers");

const window = (page: Page, name: string) => page.getByRole("dialog", { name });

async function boot(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
}

test("a project opens from the icons, at its address, and back and forward follow it", async ({ page }) => {
  await boot(page);
  await expect(window(page, "Projects")).toBeVisible();
  await expect(window(page, "Projects").getByText("4 items")).toBeVisible();

  await window(page, "Projects").getByRole("option", { name: "Web" }).dblclick();
  await window(page, "Web").getByRole("option", { name: /Hundo/ }).dblclick();
  await expect(window(page, "Hundo Info")).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/hundo$/);
  await expect(window(page, "Projects")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(window(page, "Hundo Info")).toHaveCount(0);
  await expect(window(page, "Projects")).toBeVisible();

  await page.goForward();
  await expect(window(page, "Hundo Info")).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/hundo$/);
});

test("the project's address opens its Info window over Projects, and closing it goes back to the desktop", async ({ page }) => {
  await boot(page, "/projects/hundo");
  const info = window(page, "Hundo Info");
  await expect(info).toBeVisible();
  await expect(window(page, "Projects")).toBeVisible();
  for (const label of ["Stack", "Link", "Source", "Screenshots"]) await expect(info.getByText(label, { exact: true })).toBeVisible();

  await info.getByRole("button", { name: "Close" }).click();
  await expect(info).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
});

test("Open Readme opens the README in a window that scrolls, and Esc closes it", async ({ page }) => {
  await boot(page, "/projects/hundo");
  await window(page, "Hundo Info").getByRole("button", { name: "Open Readme" }).click();
  const readme = window(page, "Hundo Readme");
  await expect(readme.getByRole("heading", { name: "Hundo" })).toBeVisible();
  const doc = readme.locator(".app-doc");
  await expect(doc).toBeFocused();
  expect(await doc.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(readme).toHaveCount(0);
});

test("the Control Panel changes the phosphor and the effects", async ({ page }) => {
  await boot(page);
  await page.getByRole("option", { name: "Jelly HD" }).dblclick();
  await window(page, "Jelly HD").getByRole("option", { name: "Control Panel" }).dblclick();
  const panel = window(page, "Control Panel");
  await panel.getByRole("radio", { name: "Amber" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-phosphor", "amber");
  await panel.getByRole("checkbox", { name: "Scanlines" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-scanlines", "false");
  await panel.getByRole("radio", { name: "Green" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-phosphor", "green");
});

test("the Terminal runs ls, and less opens a README's window", async ({ page }) => {
  await boot(page);
  await page.getByRole("option", { name: "Terminal" }).dblclick();
  const terminal = window(page, "Terminal");
  const input = terminal.getByLabel("Terminal input");
  await input.fill("ls");
  await input.press("Enter");
  await expect(terminal.getByRole("button", { name: /^projects/ })).toBeVisible();

  await input.fill("less ~/projects/web/hundo/README");
  await input.press("Enter");
  await expect(window(page, "Hundo Readme")).toBeVisible();
  await expect(terminal.getByText("opened Hundo Readme")).toBeVisible();
});

test("gero in the Terminal opens the Lab, and gero run runs a program there", async ({ page }) => {
  await boot(page);
  await page.getByRole("option", { name: "Terminal" }).dblclick();
  const terminal = window(page, "Terminal");
  const input = terminal.getByLabel("Terminal input");
  await input.fill("gero run foo");
  await input.press("Enter");
  await expect(terminal.getByText("gero: no program named foo")).toBeVisible();
  await expect(window(page, "Lab")).toHaveCount(0);

  await input.fill("gero run gcd");
  await input.press("Enter");
  await expect(terminal.getByText("opened Lab")).toBeVisible();
  const lab = window(page, "Lab");
  await expect(lab.getByRole("textbox", { name: "Program" })).toHaveValue(/^-- gcd\.gr/);
  await expect(lab.getByRole("status")).toHaveText(/^halted, \d+ steps$/);
});

test("browse in the Terminal shows its two panes in the window, and q comes back to the prompt", async ({ page }) => {
  await boot(page);
  await page.getByRole("option", { name: "Terminal" }).dblclick();
  const terminal = window(page, "Terminal");
  const input = terminal.getByLabel("Terminal input");
  await input.fill("browse");
  await input.press("Enter");
  const directory = terminal.getByRole("group", { name: "Directory" });
  await expect(directory.getByRole("button", { name: "projects/" })).toBeVisible();
  await expect(terminal.getByLabel("Selection")).toBeVisible();
  // Enter on a file pages it inside the window; q there comes back to browse.
  await directory.getByRole("button", { name: "contact.txt" }).click();
  await input.press("Enter");
  await expect(terminal.getByRole("region", { name: "~/contact.txt" })).toBeVisible();
  await input.press("q");
  await expect(directory).toBeVisible();
  await input.press("q");
  await expect(terminal.getByRole("log", { name: "Terminal output" })).toBeVisible();
});

test("the studio's Readme carries the address as a link", async ({ page }) => {
  await boot(page);
  await page.getByRole("option", { name: "Readme" }).dblclick();
  await expect(window(page, "Readme").getByRole("link", { name: "max@jellycat.fr" })).toHaveAttribute("href", "mailto:max@jellycat.fr");
});
