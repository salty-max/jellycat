import { expect, test, type Page } from "@playwright/test";

// The main screens' accessibility trees, as a screen reader gets them: names, roles, and what the Terminal's log says. A change to any of
// them shows here first. The clock is fixed, so the status bar's and the menu bar's time don't move.

const NOW = new Date("2026-11-20T18:30:00");

async function open(page: Page, path: string, layout?: "phone" | "desktop") {
  await page.clock.setFixedTime(NOW);
  await page.goto(path);
  if (layout) await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", layout);
}

const run = async (page: Page, line: string) => {
  const input = page.getByLabel("Terminal input");
  await input.fill(line);
  await input.press("Enter");
};

test.describe("the phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone's page");

  test("the home page", async ({ page }) => {
    // The first folder's cards in full, the others' by name: the descriptions are the data's, and change with it.
    await open(page, "/", "phone");
    await expect(page.locator("[data-os=phone]")).toMatchAriaSnapshot(`
      - banner:
        - link "Jellycat Studio":
          - /url: /
        - button "Control Panel"
      - main:
        - region "Jellycat Studio":
          - heading "Jellycat Studio" [level=1]
          - paragraph: Web apps, World of Warcraft addons, engines and tools.
          - term: Email
          - definition:
            - link "max@jellycat.fr":
              - /url: mailto:max@jellycat.fr
          - term: GitHub
          - definition:
            - link "github.com/salty-max":
              - /url: https://github.com/salty-max
        - navigation "Folders":
          - link "Web 4":
            - /url: /#web
          - link /Addons \\d+/:
            - /url: /#addons
          - link "Engines 1":
            - /url: /#engines
          - link "Tools 3":
            - /url: /#tools
        - region "Web 4 items":
          - heading "Web 4 items" [level=2]
          - list:
            - listitem:
              - heading "Hundo" [level=3]:
                - link "Hundo":
                  - /url: /projects/hundo
              - paragraph: Web app
              - paragraph: "Spoiler-aware, installable completion guides for single-player games: one app per game, all built on one shared core."
              - paragraph: 3 pictures
            - listitem:
              - heading "Farseer" [level=3]:
                - link "Farseer":
                  - /url: /projects/farseer
              - paragraph: Web app
              - paragraph: Every World of Warcraft blue post from the US and EU forums in one installable app, with filters and push notifications.
              - paragraph: 3 pictures
            - listitem:
              - heading "Lucarne" [level=3]:
                - link "Lucarne":
                  - /url: /projects/lucarne
              - paragraph: Web app
              - paragraph: The schedule of football fixtures and the French TV channel showing each one, from Ligue 1 to the World Cup, with live scores and push alerts, in a revival of broadcast teletext.
            - listitem:
              - heading "WoWLocker" [level=3]:
                - link "WoWLocker":
                  - /url: /projects/wow-locker
              - paragraph: Web app
              - paragraph: "Your World of Warcraft Classic characters on your phone: gear and talents, what changed during a session, bags and mail, a Hardcore character's deaths and close calls. An installable web app with an addon, in an interface based on the game."
        - region /Addons \\d+ items/:
          - heading /Addons \\d+ items/ [level=2]
          - list:
            - listitem:
              - heading "Ravenpost" [level=3]:
                - link "Ravenpost":
                  - /url: /projects/ravenpost
            - listitem:
              - heading "Hearthtale" [level=3]:
                - link "Hearthtale":
                  - /url: /projects/hearthtale
            - listitem:
              - heading "Lorekeeper's Codex" [level=3]:
                - link "Lorekeeper's Codex":
                  - /url: /projects/lorekeepers-codex
            - listitem:
              - heading "Mealbook" [level=3]:
                - link "Mealbook":
                  - /url: /projects/mealbook
            - listitem:
              - heading "Second Wind" [level=3]:
                - link "Second Wind":
                  - /url: /projects/second-wind
            - listitem:
              - heading "Keyring" [level=3]:
                - link "Keyring":
                  - /url: /projects/keyring
            - listitem:
              - heading "Goodwill" [level=3]:
                - link "Goodwill":
                  - /url: /projects/goodwill
            - listitem:
              - heading "Palaver" [level=3]:
                - link "Palaver":
                  - /url: /projects/palaver
            - listitem:
              - heading "Primer" [level=3]:
                - link "Primer":
                  - /url: /projects/primer
            - listitem:
              - heading "Yonder" [level=3]:
                - link "Yonder":
                  - /url: /projects/yonder
            - listitem:
              - heading "Yours Truly" [level=3]:
                - link "Yours Truly":
                  - /url: /projects/yours-truly
        - region "Engines 1 item":
          - heading "Engines 1 item" [level=2]
          - list:
            - listitem:
              - heading "Gero" [level=3]:
                - link "Gero":
                  - /url: /projects/gero
        - region "Tools 3 items":
          - heading "Tools 3 items" [level=2]
          - list:
            - listitem:
              - heading "addon-kit" [level=3]:
                - link "addon-kit":
                  - /url: /projects/addon-kit
            - listitem:
              - heading "wow-data" [level=3]:
                - link "wow-data":
                  - /url: /projects/wow-data
            - listitem:
              - heading "harness" [level=3]:
                - link "harness":
                  - /url: /projects/harness
      - contentinfo:
        - paragraph: Jelly-OS 1.0
    `);
  });

  test("a project page", async ({ page }) => {
    // The README by its headings: its text is A5's, and changes with it. A snapshot matches what it lists, so the rest can change.
    await open(page, "/projects/hundo", "phone");
    await expect(page.locator("[data-os=phone]")).toMatchAriaSnapshot(`
      - banner:
        - link "Jellycat Studio":
          - /url: /
        - button "Control Panel"
      - main:
        - article "Hundo":
          - link "Web":
            - /url: /#web
          - heading "Hundo" [level=1]
          - paragraph: Web app
          - paragraph: "Spoiler-aware, installable completion guides for single-player games: one app per game, all built on one shared core."
          - term: Stack
          - definition: /React \\d+, Vite, Vercel, Upstash Redis/
          - term: Link
          - definition:
            - link "hundo.quest":
              - /url: https://hundo.quest
          - term: Source
          - definition:
            - link "github.com/salty-max/hundo":
              - /url: https://github.com/salty-max/hundo
          - region "Screenshots 3 pictures":
            - heading "Screenshots 3 pictures" [level=2]
            - 'figure "Koholint, the Link''s Awakening guide: Tail Cave, chapter 1, the rest hidden"':
              - 'button "Koholint, the Link''s Awakening guide: Tail Cave, chapter 1, the rest hidden"':
                - 'img "Koholint, the Link''s Awakening guide: Tail Cave, chapter 1, the rest hidden"'
            - 'figure "Lordran, the Dark Souls Remastered guide: chapter 1, with what to do next"':
              - 'button "Lordran, the Dark Souls Remastered guide: chapter 1, with what to do next"':
                - 'img "Lordran, the Dark Souls Remastered guide: chapter 1, with what to do next"'
            - 'figure "Koholint on a phone: chapter 1, Tail Cave, and the next three things to get"':
              - 'button "Koholint on a phone: chapter 1, Tail Cave, and the next three things to get"':
                - 'img "Koholint on a phone: chapter 1, Tail Cave, and the next three things to get"'
          - region "README":
            - heading "Hundo" [level=2]
            - heading "How it's built" [level=3]
            - heading "How it's checked" [level=3]
          - navigation "Projects":
            - link "Next Farseer":
              - /url: /projects/farseer
      - contentinfo:
        - paragraph: Jelly-OS 1.0
    `);
  });

  test("the viewer", async ({ page }) => {
    await open(page, "/projects/hundo", "phone");
    await page.getByRole("region", { name: /Screenshots/ }).getByRole("button").first().tap();
    await expect(page.getByRole("dialog")).toMatchAriaSnapshot(`
      - dialog "Hundo screenshots":
        - 'figure "Koholint, the Link''s Awakening guide: Tail Cave, chapter 1, the rest hidden"':
          - text: Hundo
          - status: 1 of 3
          - 'img "Koholint, the Link''s Awakening guide: Tail Cave, chapter 1, the rest hidden"'
        - button "Previous" [disabled]
        - button "Next"
        - button "Close"
    `);
  });

  test("the Control Panel's sheet", async ({ page }) => {
    await open(page, "/", "phone");
    await page.getByRole("button", { name: "Control Panel" }).tap();
    await expect(page.getByRole("dialog")).toMatchAriaSnapshot(`
      - dialog "Control Panel":
        - heading "Control Panel" [level=2]
        - button "Close"
        - text: Phosphor
        - radiogroup "Phosphor":
          - radio "Green" [checked]
          - text: Green
          - radio "Amber"
          - text: Amber
          - radio "White"
          - text: White
        - text: Effects
        - group "Effects":
          - checkbox "Scanlines" [checked]
          - text: Scanlines
          - checkbox "Glow" [checked]
          - text: Glow
          - checkbox "Flicker"
          - text: Flicker
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

  test("the Terminal's log after ls", async ({ page }) => {
    await open(page, "/", "desktop");
    await page.getByRole("option", { name: "Terminal" }).dblclick();
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

  test("browse in the Terminal", async ({ page }) => {
    await open(page, "/", "desktop");
    await page.getByRole("option", { name: "Terminal" }).dblclick();
    await run(page, "browse");
    await expect(page.getByRole("dialog", { name: "Terminal" })).toMatchAriaSnapshot(`
      - dialog "Terminal":
        - 'group "Terminal: arrows move, Shift and arrows resize"':
          - text: ""
          - button "Collapse"
          - button "Zoom"
          - button "Close"
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
