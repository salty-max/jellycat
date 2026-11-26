import { expect, test, type Page } from "@playwright/test";

// The Lab (docs/phase-2.md): a desktop window that builds and runs a Gero program on gero.wasm, fetched from the site's own origin.
// The phone has no Lab: its home page has one card to Gero Lab, which this file checks on the phone project.

const win = (page: Page, name: string) => page.getByRole("dialog", { name });

async function boot(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
}

async function openLab(page: Page) {
  await page.getByRole("option", { name: "Lab" }).dblclick();
  const lab = win(page, "Lab");
  await expect(lab).toBeVisible();
  // The programs arrive with the window: the editor holds fizzbuzz once they have.
  await expect(lab.getByRole("textbox", { name: "Program" })).toHaveValue(/^-- fizzbuzz\.gr/);
  return lab;
}

test.describe("the desktop", () => {
  test.skip(({ isMobile }) => isMobile, "the Lab is a desktop window");

  test("opens on fizzbuzz, and Run prints FizzBuzz and says how the program ended", async ({ page }) => {
    await boot(page);
    const lab = await openLab(page);
    await expect(lab.getByText("gero 0.5.5")).toBeVisible();
    await expect(lab.getByText("fizzbuzz.gr", { exact: true }).first()).toBeVisible();

    await lab.getByRole("button", { name: "Run" }).click();
    await expect(lab.getByRole("status")).toHaveText("halted, 1076 steps");
    await expect(lab.getByRole("log", { name: "Output" })).toContainText("FizzBuzz");
    await expect(lab.getByRole("button", { name: "Run" })).toBeFocused();
  });

  test("a broken program prints its diagnostic as gero check words it", async ({ page }) => {
    await boot(page);
    const lab = await openLab(page);
    await lab.getByRole("textbox", { name: "Program" }).fill("def main(\n");
    await lab.getByRole("button", { name: "Run" }).click();
    await expect(lab.getByRole("status")).toHaveText("build failed");
    await expect(lab.getByRole("log", { name: "Output" })).toContainText(/error: .* \[E_[A-Z_]+\]\s+--> fizzbuzz\.gr:\d+:\d+/);
  });

  test("the picker opens another program, and Ctrl+Enter runs from the editor", async ({ page }) => {
    await boot(page);
    const lab = await openLab(page);
    await lab.getByRole("button", { name: "fizzbuzz.gr" }).click();
    await expect(page.getByRole("menuitemradio")).toHaveCount(12);
    await page.getByRole("menuitemradio", { name: "hello.gas" }).click();
    await expect(lab.getByRole("textbox", { name: "Program" })).not.toHaveValue(/fizzbuzz/);
    await lab.getByRole("textbox", { name: "Program" }).press("Control+Enter");
    await expect(lab.getByRole("status")).toHaveText(/^halted, \d+ steps$/);
    await expect(lab.getByRole("log", { name: "Output" })).not.toHaveText("");
  });

  test("an edit is still there after the desktop moves to a project and back", async ({ page }) => {
    await boot(page);
    // A project's Info window first, since the Lab window covers the Projects folder once it opens.
    await win(page, "Projects").getByRole("option", { name: "Web" }).dblclick();
    await win(page, "Web").getByRole("option", { name: /Hundo/ }).dblclick();
    await expect(win(page, "Hundo Info")).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/hundo$/);

    const lab = await openLab(page);
    const editor = lab.getByRole("textbox", { name: "Program" });
    await editor.fill("-- an edit\ndef main()\nend\n");

    // Back to the desktop closes the Info window, as any move does; the Lab stays with its edit. Forward brings the Info window back.
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(win(page, "Hundo Info")).toHaveCount(0);
    await expect(lab).toBeVisible();
    await expect(editor).toHaveValue("-- an edit\ndef main()\nend\n");
    await page.goForward();
    await expect(win(page, "Hundo Info")).toBeVisible();
    await expect(editor).toHaveValue("-- an edit\ndef main()\nend\n");
  });

  test("Stop ends a program that doesn't end", async ({ page }) => {
    // The step cap (10,000,000 steps, a fraction of a second here) ends a run with the same words, so Stop is pressed while the module
    // is still on its way, held for two seconds: the run is stopped at its first slice, long before the cap.
    await page.route("**/gero/gero-*.wasm", async (route) => {
      await new Promise((done) => setTimeout(done, 2000));
      await route.continue();
    });
    await boot(page);
    const lab = await openLab(page);
    await lab.getByRole("button", { name: "fizzbuzz.gr" }).click();
    await page.getByRole("menuitemradio", { name: "hello.gas" }).click();
    await lab.getByRole("textbox", { name: "Program" }).fill("main:\n.again:\n  jmp .again\n");
    await lab.getByRole("button", { name: "Run" }).click();
    await expect(lab.getByText("loading gero.wasm")).toBeVisible();
    await expect(lab.getByRole("button", { name: "Stop" })).toBeFocused();
    await lab.getByRole("button", { name: "Stop" }).click();
    await expect(lab.getByRole("status")).toHaveText(/^stopped after \d+ steps$/);
    expect(Number(/\d+/.exec((await lab.getByRole("status").textContent()) ?? "")?.[0])).toBeLessThan(1_000_000);
    await expect(lab.getByRole("button", { name: "Run" })).toBeVisible();
  });

  test("entering another window leaves the focus in it, not in the Lab", async ({ page }) => {
    await boot(page);
    await page.getByRole("option", { name: "Jelly HD" }).dblclick();
    await win(page, "Jelly HD").getByRole("option", { name: "Lab" }).dblclick();
    const lab = win(page, "Lab");
    await expect(lab.getByRole("textbox", { name: "Program" })).toHaveValue(/^-- fizzbuzz\.gr/);
    // The Lab is entered again from its icon, then Jelly HD from its own.
    const icons = page.getByRole("listbox", { name: "Desktop" });
    await icons.getByRole("option", { name: "Lab" }).dblclick();
    await icons.getByRole("option", { name: "Jelly HD" }).dblclick();
    const hd = win(page, "Jelly HD");
    await expect.poll(() => hd.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  });

  test("a Lab whose code could not be loaded says so, and the next window tries again", async ({ page }) => {
    // Every request for the chunk fails (the preload and the import), until the line is on screen.
    let refusing = true;
    await page.route("**/assets/lab-window-*.js", async (route) => {
      if (refusing) await route.abort();
      else await route.continue();
    });
    await boot(page);
    await page.getByRole("option", { name: "Lab" }).dblclick();
    const lab = win(page, "Lab");
    await expect(lab.getByText("could not load the Lab")).toBeVisible();
    refusing = false;
    // The desktop is still there.
    await expect(win(page, "Projects")).toBeVisible();
    await lab.getByRole("button", { name: "Close" }).click();
    await page.getByRole("option", { name: "Lab" }).dblclick();
    await expect(win(page, "Lab").getByRole("textbox", { name: "Program" })).toHaveValue(/^-- fizzbuzz\.gr/);
  });

  test("opens from Jelly HD too, and has no address of its own", async ({ page }) => {
    await boot(page);
    await page.getByRole("option", { name: "Jelly HD" }).dblclick();
    await win(page, "Jelly HD").getByRole("option", { name: "Lab" }).dblclick();
    const lab = win(page, "Lab");
    await expect(lab).toBeVisible();
    await lab.getByRole("button", { name: "Close" }).click();
    await expect(lab).toHaveCount(0);
    // No address of its own: the page is still the desktop's.
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("the phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone's home page");

  test("has no Lab, only a card to Gero Lab below the folders that opens in a new tab", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "phone");
    const section = page.getByRole("region", { name: "Lab" });
    await expect(section.getByRole("heading", { level: 2, name: "Lab" })).toBeVisible();
    const link = section.getByRole("link", { name: "Gero Lab" });
    await expect(link).toHaveAttribute("href", "https://gero-lab.vercel.app");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener");
    await expect(section.getByText("gero-lab.vercel.app")).toBeVisible();
    await expect(section.getByText("Browser playground for the Gero VM.")).toBeVisible();
    expect(await page.locator('a[href="/lab"]').count()).toBe(0);
  });
});
