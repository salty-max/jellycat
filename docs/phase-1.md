# Phase 1: the OS

Phase 1 of [plan.md](plan.md), split into tasks. Each task is one child session working in its own worktree and branch, and
lands as one reviewed commit or a short series. The decisions this split adds are also in [plan.md](plan.md). The user's answers
to its questions are at the end.

## Decisions this plan adds

- **Pages are shell-first.**
  - Every page prerenders the shell's session as its text. On `/projects/<slug>`, the output of `open <slug>` and of `cat` of
    its README is already on screen, scrolled to the `open` line. That is the text phones, crawlers and link previews read;
    Google indexes the phone rendering.
  - The page also prerenders the desktop's boot screen.
  - Before JS, a CSS media query shows one or the other. It is scoped to a wrapper that only the server snapshot renders
    (`data-layout="unknown"`), so a failed desktop chunk can fall back to the shell on a wide screen.
  - On wide screens the client mounts the desktop lazily. Phones never download the desktop's code.
  - One exported query string serves both the CSS variant and `matchMedia`.
- **Desktop from 768px wide and 520px tall.** Anything smaller gets the shell, so a phone turned sideways keeps it. This refines
  "chosen by width".
- **First paint is the end state.**
  - The shell shows its welcome and prompt. The typed login plays on `logout` and `exit` only.
  - The desktop shows its boot screen until the desktop is ready, and for at least the mockup's 1.3 s (none under reduced motion).
    After that, the Projects folder is open.
  - Nothing that changes between build and visit is prerendered: the clock, "Last login" and the date are client-only. A
    hydration mismatch logs an error, which costs Lighthouse best-practices.
- **The URL follows the project.**
  - Opening a project goes to `/projects/<slug>`, whether from its Info window, `open`, or a clicked name. Closing it goes back
    to `/`. Back and forward work.
  - The layout switch lives in the root, so moving between pages doesn't remount the OS.
- **The shell's names are real elements.** A project name is an `<a href="/projects/<slug>">`. A command is a `<button>`.
- **CSP by hash, in the page.**
  - At build, `buildEnd` hashes every inline `<script>` in each emitted HTML file, 404.html included.
  - It writes a `<meta http-equiv="Content-Security-Policy">` with those hashes before the first script.
  - The policy allows inline styles (`style-src 'self' 'unsafe-inline'`, as hundo's does), so a `style` prop in prerendered markup
    needs no new security decision.
  - `vercel.json`'s header carries only what a meta tag can't: `frame-ancestors 'none'`, plus `object-src`/`base-uri`. It never
    carries `default-src`, `script-src` or `style-src`, because both policies apply.
- **`sitemap.xml` and `robots.txt` are written by `buildEnd`** from the project data, with a `SITE_URL` constant. That constant
  is the vercel.app address until the launch, and it also feeds `canonical` and `og:url`.
- **Vitest, `@vitest/browser` and `@vitest/browser-playwright` move together to one exact version**, like the React Router
  packages: the Playwright provider requires its exact Vitest.
- **Each area's CSS lives next to its components** and is imported by them. `app/app.css` keeps the tokens and the CRT, so
  parallel tasks don't collide on it.
- **The OS's name and the site's address are constants in `app/core/site.ts`** (A2 creates it; D1a extends it). Every task that
  prints the name (`uname`, the welcome, the boot screen, the meta) imports it, so the rename is one edit.
- **No `gero` command and no `lab` directory in Phase 1.** They come with the Lab in Phase 2.
- **Every project has a README** (A5): `app/content/readme/<slug>.md`, in a small Markdown subset that `app/core/readme.ts`
  parses into blocks, each README a chunk of its own loaded on first use. In the file system a project is a directory holding
  it, `~/projects/<folder>/<slug>/README`; there is no `<slug>.txt`, and the card comes from `open`. `docs/design.md` Readme
  (A3) says how each layout shows it.
- **Four project folders**: `web`, `addons`, `engines` and `tools` (addon-kit, wow-data, harness), from Q1's answer. B1's
  tree, the desktop's Projects folder and D3's folder windows have all four.

## How the work runs

- **Branches and pushes.**
  - Each task is one child session in its own worktree, cut from `main`, and starts once the tasks it depends on are pushed.
  - Each lands as in Phase 0: one reviewed commit, or a short series, pushed to `main` on the user's go.
  - Production shows the work in progress at the vercel.app address until the launch.
- **Checks every task runs:**
  - `bun harness/q.ts check -- bun run check`. From A1 on, this includes every story in Chrome under each phosphor, with axe.
  - `pnpm e2e` (desktop and Pixel 7) whenever a page changes.
  - A visual task also compares its work at 1:1 with the mockup using A1's `scripts/look.mjs`, zoomed in. Any difference from
    `docs/design.md` changes that file in the same commit.
- **Files.** Tasks running at the same time never change the same file. `README.md` and `docs/design.md` are edited
  section by section; a rebase conflict there goes to the later task.
- **Models**, per CLAUDE.md:
  - Sonnet for code from a written brief.
  - Opus for prose, design, security, and the layout switch.

## The tasks

"After" names the tasks that must be on `main` first, and the questions (Q1–Q7) a task waited on; the user's answers are at
the end.

| ID  | Task                                 | Kind     | Model  | After               |
| --- | ------------------------------------ | -------- | ------ | ------------------- |
| A1  | Stack and story tests                | code     | Sonnet | -                   |
| A2  | Project data                         | prose    | Opus   | Q1                  |
| A3  | Viewer mockup                        | design   | Opus   | -                   |
| A4  | Content-Security-Policy              | security | Opus   | -                   |
| A5  | Project write-ups                    | prose    | Opus   | A2                  |
| B1  | Core: file system and commands       | code     | Sonnet | A2                  |
| B2  | The look: settings, CRT, icons, font | code     | Sonnet | A1                  |
| D1a | Pages, meta, sitemap                 | code     | Sonnet | A2, A4, A5          |
| E3  | Screenshots                          | prose    | Opus   | A1, A2, Q3          |
| C1  | Shell                                | code     | Sonnet | A5, B1, B2          |
| C2a | Windows and dialogs                  | code     | Sonnet | B2                  |
| C2b | Desktop surface                      | code     | Sonnet | B2                  |
| D1b | Layout switch                        | code     | Opus   | C1, C2a, C2b, D1a   |
| D2  | `browse`                             | code     | Sonnet | C1, D1b             |
| D3  | Desktop apps                         | code     | Sonnet | D1b, Q4             |
| E1  | Menu bar and system dialogs          | code     | Sonnet | D3                  |
| E2  | Screenshot viewer                    | code     | Sonnet | A3 approved, D3, E3 |
| F1  | Accessibility and Lighthouse pass    | code     | Opus   | all above           |
| F2  | Launch on the domain                 | ops      | Sonnet | F1, Q5, Q6, Q7      |

**What runs at the same time.** Each wave can start as soon as its dependencies are on `main`:

1. A1, A2, A3, A4; A5 once A2 is on `main`.
2. B1, B2, D1a, E3.
3. C1, C2a, C2b.
4. D1b.
5. D2 and D3.
6. E1 and E2.
7. F1.
8. F2.

The critical path is A2 → B1 → C1 → D1b → D3 → E1/E2 → F1 → F2.

### A1 Stack and story tests (code)

**Delivers**
- Every Phase 1 package:
  - `@base-ui/react` and `zustand`;
  - `@storybook/addon-vitest`;
  - `vitest`, `@vitest/browser` and `@vitest/browser-playwright`, pinned exactly;
  - `@testing-library/user-event`, `@axe-core/playwright` and `sharp`.
- Vitest projects:
  - `unit`: jsdom, the current setup.
  - `stories:green`, `stories:amber` and `stories:white`. Each uses `storybookTest({ initialGlobals: { phosphor } })` and
    `extends: false`. They run headless in the system Chrome with `parameters.a11y.test: "error"`, so axe fails the run.
- `viteFinal` adds `tailwindcss()`. A low-contrast story, not committed, proves that axe sees the styles.
- A self-registering store reset (zustand's `__mocks__/zustand.ts` pattern) for both the unit and the story projects, so no task
  keeps a list of its stores.
- `scripts/look.mjs`. It screenshots the mockup's frame (652×480, from the `mockups` server) and a Storybook story at the same
  size, at 1:1. It writes the two side by side, with 4× crops, to `.cache/look/`.
- README Scripts and Layout (`scripts/look.mjs`); CLAUDE.md's Versions rule names the Vitest trio.

**Files:** `package.json`, the lockfile, `vitest.config.ts`, `.storybook/*`, `scripts/look.mjs`, `tsconfig.json`,
`eslint.config.js`, `.gitignore`, `ci.yml` if the check job needs it, README Scripts, CLAUDE.md Versions.

**Checks**
- `pnpm check` runs the BootScreen story under the three phosphors.
- `pnpm build-storybook`.
- `look.mjs` run once on the boot screen.

### A2 Project data (prose)

**Delivers**
- `app/core/projects.ts`, holding the type and the data:
  - the type has slug, name, folder (`web` / `addons` / `engines` / `tools`), kind, description, stack, link, source and
    `screenshots: { src, size, alt, width, height }[]`, where `src` is a path without extension (E3 writes `<src>.avif` and
    `<src>.webp`) and `size` is `desktop` or `phone`;
  - the data is every project from Q1, its facts from its own README; unknown is `-`.
- `app/core/site.ts`, holding the OS name and `SITE_URL` (the vercel.app address until F2).
- README Layout names `app/core/`.
- `app/core/studio.ts`, holding the studio's Readme and `contact.txt`, with the address `max@jellycat.fr` (Q6) as a link.
- A unit test of the data's rules: unique slugs, no empty strings, `https` links, no unknown folders.

**Files:** `app/core/projects.ts`, `app/core/studio.ts`, `app/core/site.ts`, README Layout and their tests.

**Checks:** unit tests; a cold read of every line against its README.

### A3 Viewer mockup (design)

**Delivers** the mockups the approved ones lack:
- the screenshot viewer as a desktop window: image in its own colours, previous/next, count, caption, CRT on top;
- the same viewer full screen on the phone, opened from the shell, with a key bar like `browse`'s;
- the Info window's and the `open` card's Source and Screenshots rows.

It edits `mockups/phosphor-desktop.html` and `phosphor-shell.html` in their style (or adds one file), with a stand-in image
marked as a placeholder. It ends with the user's approval, through the opener.

**Files:** `mockups/*`.

**Checks:** opened in real Chrome at 1:1; screenshots sent with the report.

### A4 Content-Security-Policy (security)

**Delivers**
- A `buildEnd` step, in its own module, called from `react-router.config.ts`:
  - finds `<meta charset>` case-insensitively (the build writes `charSet`);
  - asserts exactly one insertion before the first `<script>`;
  - hashes the raw bytes of each inline script;
  - writes the meta CSP: `default-src 'self'; script-src 'self' 'sha256-…'…; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; object-src 'none'; base-uri 'self'`.
- `vercel.json`'s header gets `frame-ancestors 'none'; object-src 'none'; base-uri 'self'`.
- `e2e/csp.spec.ts`:
  - walks every `.html` file in `build/client`;
  - listens for `securitypolicyviolation` through `addInitScript`;
  - expects none, and expects hydration to finish.
- README Build: the mechanism, and the Vercel toolbar being blocked on previews.

**Files:** `react-router.config.ts` (`buildEnd`), the CSP module, `vercel.json`, `e2e/csp.spec.ts`, README Build.

**Checks**
- `pnpm check` and `pnpm e2e`.
- Lighthouse best practices still at 100.
- After the push, `curl -sI` on the preview or production for both headers. `serve.mjs` and LHCI don't send `vercel.json`'s
  headers, so this is the only test of `frame-ancestors`.

### A5 Project write-ups (prose)

**Delivers**
- `app/content/readme/<slug>.md`, one README per project for a professional reader (a client, a recruiter, a developer): what
  it is, how it's built, and the engineering that doesn't show from outside. The user approved the shape and the Hundo and
  harness samples ("Approve as is"):
  - `# <Name>`, a paragraph saying what it is, `## How it's built`, `## How it's checked`, at most one closing line;
  - 250 to 500 words, neutral third person, every fact from the project's own repository; no Stack or Links section, which
    the card already shows;
  - the subset: one `#` title, `##` headings, one-line paragraphs, one-level `- ` lists, code spans, and links to `https://…`
    or to another project as `/projects/<slug>`.
- `app/core/readme.ts`:
  - `parseReadme`: the blocks (title, heading, paragraph, list; inline text, code, link, project link). Anything outside the
    subset throws, naming the file and line.
  - `loadReadme(slug)`: each README a chunk of its own, loaded and parsed on first use, the same promise for the same slug
    (React's `use()` reads it; a loader awaits it). The 19 together are about 54 KB, 19 KB gzipped, and a visitor reads one
    at a time.
  - `README_SLUGS` and `readmeText` (the plain text, each link as its words).
- A card corrected where the project's code disagreed with A2's reading of its README: Lucarne's stack is Postgres (its
  README's Workers + D1 intro and SQLite host section are stale).
- `studio.ts`'s Readme says "Each project has a README in the projects folder."; README Layout names `app/content/readme/`
  and `readme.ts`.

**Files:** `app/content/readme/*`, `app/core/readme.ts` and its test, `app/core/projects.ts` (Lucarne's stack, the slug's
comment), `app/core/studio.ts` (one line), README Layout, this section and its knock-ons in B1, C1, D1a, D1b, D2 and D3.

**Checks**
- Unit tests: every project has a README and every README a project; each is titled with the project's name, opens with what
  it is, has the two sections in order, runs 250 to 500 words, and has no em dash, filler word or local path; the parser
  refuses each construct left out, naming the line.
- A cold read of every text against its repository, by an agent that didn't write it.

### B1 Core: file system and commands (code, no React)

**Delivers**
- `app/core/fs.ts`: the tree built from the data, path resolution with `~`, `.` and `..`, and sorting. The tree is:
  - `README`;
  - `contact.txt`;
  - `projects/<folder>/<slug>/README`, a directory per project holding its README (A5). No `<slug>.txt`: the card comes
    from `open`.
- `app/core/shell.ts`: a pure command runner. It takes a line and the session (cwd, history) and returns the output plus the
  new session.
  - Commands: `help`, `ls`, `cd`, `cat`, `less`, `more`, `open`, `tree`, `browse`, `theme`, `crt`, `clear`, `history`, `pwd`,
    `whoami`, `date`, `uname`, `echo`, `logout`, `exit`, `view <project>` and `&&`.
  - Output is typed segments: text, dim, command button, project link, external link, project card, and a README by its slug,
    which the renderer fills (C1), so the runner stays pure and synchronous.
  - The `open` card ends with a README row: its path, which runs `less`. A README's name in `ls` and `tree` pages it.
  - `view <project>` runs the viewer (`docs/design.md` Viewer): the "view project" effect, which E2 plugs into C1's full-screen
    slot; a project with no screenshots prints `view: <slug>: no screenshots`.
  - Effects are returned, never performed: open project, view project, page a file (`less` and `more`; the host pages it, and
    `more` prints a file that fits, as `docs/design.md` Readme says), set theme, set CRT, browse, clear, logout. `page`,
    `view`, `browse` and `logout` end the line, so what follows a `&&` there isn't run; `clear` empties the log before the
    line's output, the echo included. The host echoes `prompt(cwd)` and the line itself.
  - `run(line, session, { now })` takes the clock, so `date` stays pure. `banner()`, `lastLogin(now)` and `welcome()` give C1 the login's lines.
  - `ls` and `tree` sort directories first, then by name, as the mockup does (`contact.txt` before `README`); Tab's path
    options sort the same way, where the mockup used insertion order.
- Tab completion and history as pure functions: `complete(line, cwd)` returns the new line and, when several names share no
  more letters, the names to list; `historyStep(history, index, "up" | "down")`.
- Messages worded as in the mockup. `uname` and the welcome take the OS name from `app/core/site.ts`.
- `logout` and `exit` both return the logout effect.

**Files:** `app/core/fs.ts`, `app/core/shell.ts`, `app/core/complete.ts` and their tests.

**Checks:** unit tests port every behaviour of `phosphor-shell.html`, errors included.

### B2 The look: settings, CRT, icons, font (code)

**Delivers**
- `app/core/settings.ts`, a zustand store:
  - holds phosphor, scanlines, glow, flicker and dither;
  - is persisted with `skipHydration` and rehydrated in an effect.
- A head script that applies the saved settings as `<html data-*>` attributes before first paint, with
  `suppressHydrationWarning` on `<html>`. Settings reach first paint only through those attributes.
- `Crt` with each effect switchable. Flicker is off by default and never runs under reduced motion.
- The dither as a utility.
- The 1-bit icons as SVG components drawn from the mockup's 16×16 grids, plus the 8×8 title-bar glyphs:
  - the outline in `currentColor`, the inside in the tube's black;
  - an inverted variant.
- The VT323 latin woff2 preloaded, with a metric-matched fallback so the swap doesn't shift a page of text.
- The glow reconciled between the two mockups (2px dim on the desktop, 3px on the shell). `docs/design.md` updated.

**Files:** `app/app.css`, `app/os/crt.tsx`, `app/os/icons/*`, `app/core/settings.ts`, `app/root.tsx` (head),
`docs/design.md` Screen and Icons.

**Checks:** stories for every icon and CRT state; `look.mjs` against both mockups' icons, zoomed in; e2e: a saved amber setting
paints amber with no hydration error.

### D1a Pages, meta, sitemap (code)

**Delivers**
- The route `/projects/:slug`. Its prerender list comes from the data.
- Per page: title, description, canonical, `og:title`, `og:description` and `og:url`, from `app/core/site.ts` (A2's; D1a adds
  what the meta needs).
- An unknown slug answers 404. Loaded directly, Vercel serves `404.html`, which the browser then matches against
  `projects/:slug`: the route throws a 404 `Response`, and the root `ErrorBoundary` renders the same screen as `not-found.tsx`.
- `sitemap.xml` and `robots.txt` written in `buildEnd`.
- `lighthouserc.json` adds one project page.
- The route's loader returns the README's blocks (A5's `loadReadme(slug)`, awaited at build), so the prerendered page holds
  them and hydration gets the same blocks as loader data; D1b hands them to the shell.
- The page body stays the current boot screen until D1b.

**Files:** `app/routes.ts`, `app/routes/project.tsx`, the meta in `app/routes/home.tsx`, the prerender list
and the sitemap/robots step in `react-router.config.ts`, `e2e/pages.spec.ts`, `lighthouserc.json`.

**Checks**
- e2e: every project URL answers 200 with its title and description in the HTML.
- e2e: the sitemap lists every page, robots names the sitemap, an unknown slug gets 404.
- e2e, both projects: `/projects/no-such` loaded in the browser shows the not-found page with no console error and no
  hydration warning.
- Lighthouse SEO at 100 on both URLs.

### E3 Screenshots (prose)

**Delivers**
- `scripts/screenshots.mjs`, in the spirit of hundo's:
  - opens each web app's live site in the system Chrome at desktop and phone sizes;
  - writes AVIF and WebP with `sharp` to `public/screenshots/<slug>/`.
- The `screenshots` entries in `projects.ts`, with alt text saying what each picture shows.
- README Layout names `public/screenshots/`.
- The user's in-game pictures of the addons go through the same script when they come.

**Files:** `scripts/screenshots.mjs`, `public/screenshots/**`, the `screenshots` fields in `app/core/projects.ts`.

**Checks:** each image opened at 1:1; the alt text read against the picture.

### C1 Shell (code)

**Delivers** `app/os/shell/*`: the terminal over B1's runner. It is size-agnostic: it fills its box, full screen on a phone
or inside the desktop's Terminal window.
- **Prompt and input**
  - Prompt `guest@jellycat:<path>$` with a block cursor, hollow when the shell isn't focused.
  - A real, labelled input. It is never autofocused on phones, and its font size is at least 16px.
  - Tab completion, history on ↑↓, Ctrl-C, Ctrl-L and Ctrl-U.
- **Output:** `role="log"`; names are links and buttons.
- **Status bar:** inverse video, with the clock rendered client-only.
- **Login:** first paint shows the welcome and prompt; the typed login plays on `logout`.
- **Effects:** `theme` and `crt` go to the settings store. "open project" and "browse" go to the host through props:
  `onOpenProject`, `initialCommand`, and a full-screen slot. D1b and D2 plug in through these without editing the shell.
- **README** (A5's blocks, `docs/design.md` Readme): `cat` prints the blocks the host gave it (the deep link's, from the
  page's loader), else `use()` on `loadReadme(slug)`, which suspends until the chunk arrives; real
  headings, lists and `code`, their marks dim by CSS. `less` and `more` page it in the full-screen slot, with the path, the
  position and the key bar; `q` goes back to where it was opened. An https link opens in a new tab; a project link runs
  `open <slug>`.
- Its CSS sits next to it.

**Files:** `app/os/shell/*`, `docs/design.md` Shell.

**Checks:** component tests with user-event; stories (fresh, after commands, unfocused); `look.mjs` against
`phosphor-shell.html` at 1:1.

### C2a Windows and dialogs (code)

**Delivers**
- A zustand window manager:
  - open, focus, close, collapse and zoom;
  - move and resize, with the mockup's clamping;
  - z-order and cascade placement;
  - a registry from app id to component, in `app/os/desktop/registry.ts`, which C2a owns. Later tasks add one line each; a
    rebase conflict there goes to the later task.
- The window frame:
  - a 1px frame, a 3px dim shadow and a 22px title bar, inverse when in front;
  - collapse, zoom and close boxes, and the grip;
  - pointer drag and resize;
  - keyboard: arrows on the focused title bar move the window, Shift+arrows resize it.
- Non-modal dialog semantics: focus goes into a window when it opens and back to the opener when it closes.
- The alert dialog on Base UI's AlertDialog: double border, default button.

**Files:** `app/os/desktop/windows/*`, `docs/design.md` Desktop (windows and dialogs).

**Checks:** store unit tests; component tests for keyboard move and resize; stories; `look.mjs` against the desktop mockup's
windows.

### C2b Desktop surface (code)

**Delivers**
- The desktop surface:
  - the dither, switched by the settings;
  - the icon column on the right, with Trash at the bottom;
  - selection: a click selects; a second click, a double click or Enter opens; arrows move between icons;
  - selected icons inverted.
  - Opening is a callback prop.
- The boot screen with the cat, and the shut-down screen. The OS name comes from `app/core/site.ts` and stays an `<h1>`
  ("Jelly-OS 1.0"), which `e2e/smoke.spec.ts` looks for until D1b changes it.
- The menu bar's frame, with an empty slot and the client-only clock.

**Files:** `app/os/desktop/surface/*`, `app/os/boot-screen.tsx`.

**Checks:** component tests for selection and keys; stories; `look.mjs` against the desktop mockup.

### D1b Layout switch (code, Opus)

**Delivers**
- `app/os/layout.tsx` in the root:
  - `useSyncExternalStore` on the shared query, with a server snapshot of `"unknown"`;
  - the prerendered shell session and boot screen;
  - on wide screens, the desktop `import()` starts at module top level when the query matches;
  - a failed chunk falls back to the shell;
  - crossing the breakpoint swaps the layout.
- A `Desktop` assembled from C2a and C2b.
- The shell's `/projects/<slug>` deep link, through `initialCommand`: `open <slug>`, then `cat ~/projects/<folder>/<slug>/README`
  rendered from the loader's blocks, so hydration matches the prerender without waiting for a chunk, scrolled to the `open`
  line. The project's name is the page's `h1`, the README's headings its
  `h2` and `h3`.
- URL ↔ state: `onOpenProject` pushes the URL; back and forward work.
- `smoke.spec.ts` updated: the phone sees the shell.

**Files:** `app/root.tsx`, `app/os/layout.tsx`, `app/os/desktop/desktop.tsx`, the bodies of `app/routes/home.tsx` and
`project.tsx`, `e2e/layout.spec.ts`, `e2e/smoke.spec.ts`.

**Checks**
- e2e on both projects:
  - the phone gets the shell and never requests the desktop chunk;
  - the desktop boots;
  - no console errors and no hydration mismatch, on `/`, on a project page and on 404.html at a nested path;
  - back and forward work.
- Lighthouse.

### D2 `browse` (code)

**Delivers** the two-pane browser in the shell's full-screen slot:
- double borders with the titles set in them, and the key bar;
- keys: j/k and the arrows, Enter, Backspace, q and Esc;
- clickable rows and keys;
- a project's directory shows its card, and its README the text; Enter on the README pages it (`less`), and `q` there comes
  back to `browse`;
- `q` returns to the prompt as it was.

**Files:** `app/os/shell/browse/*`, plus the one line that registers it. D2 also gave the slot two things the mockup has: the view carries
the session's `cwd` (browse opens there) and the API a `setPath` (the status bar shows the browsed path), a few lines in `shell.tsx` and
`full-screen.ts` (the user decided both).

**Checks:** component tests; story; `look.mjs` against the mockup; e2e on the phone (the shell is on the page since D1b).

### D3 Desktop apps (code)

**Delivers**
- The desktop's folder model (Jelly HD: Projects, Readme, Terminal, Control Panel; Trash empty) beside the apps; Projects and
  its folders read B1's file system.
- Folder windows (Jelly HD, Projects, Web, Addons, Engines, Tools, Trash):
  - by icon or by name;
  - an info line with the item count and the view.
- The project's Info window: icon, name and kind; Stack, Link and Source; the description; and Open Readme, its default
  button, which opens `<Name> Readme`, a text window that scrolls with the 1-bit scroll bar (A5's blocks through
  `loadReadme`). In the Terminal window, `less` opens that window.
- Readme.
- Control Panel: phosphor radios and effect checkboxes on Base UI, bound to the settings.
- Terminal: C1 in a window.
- No Mail (Q4): the Readme and `contact.txt` carry the address as a link.
- The desktop's URL behaviour: Projects open at `/`, and the Info window at `/projects/<slug>`, over Projects.

**Files:** `app/os/desktop/apps/*`, `app/os/desktop/desktop.tsx`, `app/os/layout.tsx` (the URL part), `e2e/desktop.spec.ts`. It adds
its apps to the registry.

**Checks:** component tests; stories; `look.mjs` against each of the mockup's windows; e2e on the desktop: open a project from
the icons, its URL, back, the Control Panel changes the phosphor, the Terminal runs `ls`.

### E1 Menu bar and system dialogs (code)

**Delivers** the menu bar on Base UI's Menubar and Menu:
- the menus:
  - the cat menu: About and Control Panel;
  - File: Open, Get Info and Close Window;
  - Edit: dim;
  - View: by Icon and by Name, checked;
  - Special: the phosphors, CRT effects, Dither, Restart and Shut Down…;
  - Window: the open windows, the current one checked;
- dim items for anything that can't act now;
- hover moves between menus while one is open; the keyboard works; Esc closes;
- the About and Shut Down dialogs, and Restart.

**Files:** `app/os/desktop/menubar/*`, the slot in `desktop.tsx`.

**Checks:** component tests (keyboard); stories; `look.mjs` against the open menus; e2e: every menu item.

### E2 Screenshot viewer (code)

**Delivers** A3's approved design:
- a desktop viewer window;
- the phone viewer full screen from the shell;
- images in their own colours under the CRT layer, with `width`/`height` set and loaded lazily (AVIF/WebP);
- ←/→ and Esc;
- the Screenshots rows in the Info window and the `open` card. A project without pictures has no row.

**Files:** `app/os/viewer/*`, a row in the Info window, a segment in the card, the registry line.

**Checks:** component tests; stories; `look.mjs` against A3's mockup; e2e on both projects.

### F1 Accessibility and Lighthouse pass (code, Opus)

Story-level axe already gates the components; this pass covers what it can't.

**Delivers**
- A keyboard-only e2e walk through both layouts: every app opened and closed with no mouse.
- `@axe-core/playwright` on `/`, a project page and `404.html`, on both Playwright projects: the shell and the boot screen are
  prerendered together, where page-level rules (two `h1`s, duplicate landmarks or ids) break and no story sees them.
- Playwright aria snapshots of the main screens, so names, roles and the log's announcements are fixed.
- A reduced-motion run: the boot, the login and the flicker are instant or off.
- Visible focus everywhere.
- A second Lighthouse config on the desktop preset, and its step in `ci.yml`. Lighthouse at 100/100/100 and ≥0.9 on `/` and a
  project page, phone and desktop.
- Fixes for what it finds.

**Files:** whatever the findings touch, `lighthouserc*.json`, `ci.yml`.

### F2 Launch on the domain (ops)

**Delivers**
- `SITE_URL` moved to `https://jellycat.fr` (Q5). The contact address is set since A2 (Q6), and the OS name stays Jelly-OS
  (Q7).
- `https://hundo.quest`, Hundo's Link, checked to serve before the launch ([still open](#still-open)). If it doesn't, the
  user is asked through the opener.
- The domain attached in Vercel, with `www` redirecting to the apex. That needs the user's go. DNS is the user's.
- Production probed: the headers (CSP, `frame-ancestors`), `/sitemap.xml`, the canonicals, 404.
- README Hosting and `docs/plan.md` updated.

**Files:** `app/core/site.ts`, README, `docs/plan.md`, and `app/core/projects.ts` if the user changes Hundo's Link.

## The user's answers

Given on 19 Nov 2026, when wave 1 opened. Each names the tasks it unblocked.

1. **Which projects are on the site?** (A2) The user's words: "The recommended 18 but somme modifications. Drop Opus it is not
   finished. And imo Addon-kit + wow-data deserve a word. Same for harness it is an AI world now". Then, told that nothing in
   gtx-16 runs yet (its README says so): "Drop it like Opus". So 19 projects, in four folders:
   - Web: Hundo, Farseer, Lucarne, WoWLocker.
   - Addons: Ravenpost, Hearthtale, Lorekeeper's Codex, Mealbook, Second Wind, Keyring, Goodwill, Palaver, Primer, Yonder,
     Yours Truly.
   - Engines: Gero, with Gero Lab as its link.
   - Tools, the fourth folder: addon-kit, wow-data and harness.
   - Left out: Opus, not finished; gtx-16, nothing in it runs yet; Watchtower, which its README calls a menu-bar app on the
     author's Mac; wowguessr, a working name, not hosted.
2. **Links and source.** (A2) Link is the project's own site, from its README or its GitHub homepage field, else `-`. Source is
   the GitHub repository for every public one, else `-`.
   - `gh repo view` on 19 Nov 2026: all 19 are public, harness, addon-kit and wow-data included (gtx-16, dropped since, was the
     private one), so every Source is set.
   - Hundo's Link is the user's word, not its README's: "I'll deploy hundo.quest" ([still open](#still-open)).
3. **Screenshots.** (E3, and so E2) The web apps' pictures are captured from their live sites by a script here (E3). The
   addons' come later, from the user's own pictures in game. A2 leaves every `screenshots` list empty; E3 fills them. A project
   with no pictures has no Screenshots row.
4. **Mail.** (D3) No Mail on the Phase 1 desktop. `contact.txt` and the Readme carry the address as a link.
5. **The domain.** (F2) jellycat.fr, the apex canonical and `www` redirecting to it. `SITE_URL` stays
   `https://jellycat-iota.vercel.app` until F2.
6. **The contact address.** (A2) `max@jellycat.fr`, the user's own choice over `hello@`. A2 puts it in `app/core/studio.ts`.
7. **The OS name.** (F2) Jelly-OS stays.

### Still open

- **hundo.quest.** Hundo's Link is `https://hundo.quest`: the user will deploy something on the apex. Until then it answers
  Vercel's `DEPLOYMENT_NOT_FOUND`, so the link is dead on the vercel.app production as soon as a task shows the projects;
  Hundo's README only names its six guides' sites (koholint.hundo.quest and the others). F2 checks the apex serves before the
  launch. E3 captures a guide's site for Hundo's pictures, as before.
