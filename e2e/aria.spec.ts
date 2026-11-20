import { expect, test, type Page } from "@playwright/test";

// The main screens' accessibility trees, as a screen reader gets them: names, roles, and what the shell's log says. A change to any of
// them shows here first. The clock is fixed, so the status bar's and the menu bar's time don't move.

const NOW = new Date("2026-11-20T18:30:00");

async function open(page: Page, path: string, layout?: "shell" | "desktop") {
  await page.clock.setFixedTime(NOW);
  await page.goto(path);
  if (layout) await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", layout);
}

const run = async (page: Page, line: string) => {
  const input = page.getByLabel("Terminal input");
  await input.fill(line);
  await input.press("Enter");
};

test.describe("the shell", () => {
  test.skip(({ isMobile }) => !isMobile, "the shell is the phone's");

  test("the home page", async ({ page }) => {
    await open(page, "/", "shell");
    await expect(page.locator("main")).toMatchAriaSnapshot(`
      - main:
        - log "Terminal output":
          - text: "Jellycat Studio. Type help for the commands, or click a name. Try:"
          - button "ls"
          - button "tree"
          - button "open hundo"
          - button "browse"
        - text: /\\[jellycat\\] 0:jsh\\* ~ \\d+:\\d+/
        - textbox "Terminal input"
    `);
  });

  test("a project page", async ({ page }) => {
    // The card and the README's title: the README's own text is A5's, and changes with it.
    await open(page, "/projects/hundo", "shell");
    await expect(page.getByRole("log")).toMatchAriaSnapshot(`
      - log "Terminal output":
        - text: "Jellycat Studio. Type help for the commands, or click a name. Try:"
        - button "ls"
        - button "tree"
        - button "open hundo"
        - button "browse"
        - text: guest@jellycat:~$ open hundo
        - heading "Hundo" [level=1]
        - text: "/Web app Spoiler-aware, installable completion guides for single-player games: one app per game, all built on one shared core\\\\. Stack React \\\\d+, Vite, Vercel, Upstash Redis Link/"
        - link "hundo.quest":
          - /url: https://hundo.quest
        - text: Source
        - link "github.com/salty-max/hundo":
          - /url: https://github.com/salty-max/hundo
        - text: Screenshots
        - button "3 pictures"
        - text: README
        - button "~/projects/web/hundo/README"
        - text: guest@jellycat:~$ cat ~/projects/web/hundo/README
        - heading "Hundo" [level=2]
    `);
  });

  test("the log after ls", async ({ page }) => {
    await open(page, "/", "shell");
    await run(page, "clear");
    await run(page, "ls ~/projects/web");
    await expect(page.getByRole("log")).toMatchAriaSnapshot(`
      - log "Terminal output":
        - text: guest@jellycat:~$ ls ~/projects/web
        - link "farseer/":
          - /url: /projects/farseer
        - link "hundo/":
          - /url: /projects/hundo
        - link "lucarne/":
          - /url: /projects/lucarne
        - link "wow-locker/":
          - /url: /projects/wow-locker
    `);
  });

  test("browse", async ({ page }) => {
    await open(page, "/", "shell");
    await run(page, "browse");
    await expect(page.locator("main")).toMatchAriaSnapshot(`
      - main:
        - text: "~"
        - group "Directory":
          - button "projects/"
          - button "contact.txt"
          - button "README"
        - text: projects/
        - region "Selection": addons/ engines/ tools/ web/
        - button "j k move"
        - button "Enter open"
        - button "Bksp up"
        - button "q quit"
        - text: /\\[jellycat\\] 0:browse\\* ~ \\d+:\\d+/
        - textbox "Terminal input"
    `);
  });
});

test.describe("the desktop", () => {
  test.skip(({ isMobile }) => isMobile, "the desktop is for computers");

  test("the desktop", async ({ page }) => {
    await open(page, "/", "desktop");
    await expect(page.locator("main")).toMatchAriaSnapshot(`
      - main:
        - menubar:
          - menuitem "Jelly-OS"
          - menuitem "File"
          - menuitem "Edit"
          - menuitem "View"
          - menuitem "Special"
          - menuitem "Window"
        - time: /\\d+:\\d+/
        - listbox "Desktop":
          - option "Jelly HD"
          - option "Projects"
          - option "Readme"
          - option "Terminal"
          - option "Trash"
        - dialog "Projects":
          - 'group "Projects: arrows move, Shift and arrows resize"':
            - button "Collapse"
            - button "Zoom"
            - button "Close"
          - text: 4 items by icon
          - listbox "Projects":
            - option "Web"
            - option "Addons"
            - option "Engines"
            - option "Tools"
    `);
  });

  test("a project's Info window", async ({ page }) => {
    await open(page, "/projects/hundo", "desktop");
    await expect(page.getByRole("dialog", { name: "Hundo Info" })).toMatchAriaSnapshot(`
      - dialog "Hundo Info":
        - 'group "Hundo Info: arrows move, Shift and arrows resize"':
          - text: ""
          - button "Collapse"
          - button "Zoom"
          - button "Close"
        - paragraph: Hundo
        - paragraph: Web app
        - text: /Stack React \\d+, Vite, Vercel, Upstash Redis Link/
        - link "hundo.quest":
          - /url: https://hundo.quest
        - text: Source
        - link "github.com/salty-max/hundo":
          - /url: https://github.com/salty-max/hundo
        - text: Screenshots 3 pictures
        - button "View"
        - paragraph: "Spoiler-aware, installable completion guides for single-player games: one app per game, all built on one shared core."
        - button "Open Readme"
    `);
  });

  test("the About dialog", async ({ page }) => {
    await open(page, "/", "desktop");
    await page.getByRole("menubar").getByRole("menuitem", { name: "Jelly-OS", exact: true }).press("Enter");
    await page.getByRole("menuitem", { name: "About Jelly-OS" }).press("Enter");
    await expect(page.getByRole("alertdialog")).toMatchAriaSnapshot(`
      - alertdialog "Jelly-OS 1.0":
        - paragraph: Jelly-OS 1.0
        - text: Jellycat Studio
        - button "OK"
    `);
  });
});

test("404.html", async ({ page }) => {
  await open(page, "/no/such/page");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.locator("body")).toMatchAriaSnapshot(`
    - main:
      - heading "404" [level=1]
      - paragraph: There's no page at this address.
      - link "Go to the home page":
        - /url: /
  `);
});
