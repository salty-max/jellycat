# Plan

Jellycat Studio's portfolio is a made-up operating system, Jelly-OS, on a phosphor CRT. On a computer it is a desktop: a menu bar,
icons, windows. On a phone it is a shell: a prompt, commands, a two-pane browser. Both read the same project data and the same
file system, and the shell is also the desktop's Terminal app.

The mockups that settled the look are in [`mockups/`](../mockups) (`pnpm` isn't needed: open them in a browser, or start the
`mockups` server in `.claude/launch.json`). `phosphor-desktop.html` and `phosphor-shell.html` are the reference; `win95-desktop.html`
was the alternative, kept for its record.

## Decisions

- **Look**: a monochrome phosphor CRT (green by default, amber and white as settings). Our own OS: no Fallout, Vault-Tec, RobCo or
  Pip-Boy assets, no Apple or Microsoft logos, fonts, icons or sounds. [design.md](design.md) has the rules.
- **Desktop on computers, shell on phones.** One layout per kind of screen, chosen by screen size, not two sites.
- **Real pages**: every project has its own URL, prerendered to HTML at build time (React Router's `prerender` with `ssr: false`),
  so search engines and link previews read real text. The text on screen is HTML, never pixels in a canvas.
- **Pages are shell-first.** Every page prerenders the shell's session as its text (on `/projects/<slug>`, `open <slug>` and `cat`
  of its README have already run) and the desktop's boot screen. A screen at least 768px wide and 520px tall mounts the desktop on
  the client; phones never download its code. First paint is the end state: the typed login plays on `logout` and `exit` only, and
  nothing that changes between build and visit (the clock, "Last login", the date) is prerendered.
- **The URL follows the project**: `/projects/<slug>` while a project is open, `/` once it's closed.
- **CSP in the page**: the build hashes each page's inline scripts into a `<meta>` Content-Security-Policy; the header carries
  what a meta tag can't (`frame-ancestors`). Inline styles are allowed, as in hundo.
- **Screenshots stay in colour.** The phosphor look covers the OS; the work itself is shown as it is, in a viewer window, with the
  CRT layer still on top.
- **Copy**: facts from each project's own repository: its README, or its code where the README is stale. No taglines, jokes,
  invented numbers or statuses. An unknown fact is written `-`.
- **Projects**: 19, in four folders (web, addons, engines, tools). A project's Link is its own site and its Source its public
  repository, else `-`. [phase-1.md](phase-1.md#the-users-answers) has the list.
- **Each project has a README**: a few hundred words for a professional reader on what it is, how it's built and how it's
  checked, every fact from its own repository, in a small Markdown subset. A project is a directory holding it
  ([phase-1.md](phase-1.md#a5-project-write-ups-prose)).
- **Stack**: hundo's tools in one package: React 19, React Router 8 (framework mode), Vite 8, Tailwind 4, Vitest, Testing Library,
  Storybook 10, Playwright, Lighthouse CI, ESLint. Base UI and zustand come in with Phase 1's first components. Vitest and its
  browser packages move together to one exact version, as the React Router packages do.
- **Hosting**: Vercel, team `jellycat`, a preview per pull request. The site launches on jellycat.fr, the apex canonical and
  `www` redirecting to it. The address on the site is max@jellycat.fr; the Phase 1 desktop has no Mail app.

## Phases

### Phase 0: groundwork

The harness, the scaffold, CI, the Vercel config and these docs. The GitHub repository and the Vercel project are created on the
user's go.

### Phase 1: the OS (launchable)

[phase-1.md](phase-1.md) splits it into tasks, with their order, files and checks.

- The shared core: project data, the file system built from it, the shell's commands, the phosphor themes, the CRT layer.
- The desktop: menu bar and menus, windows (move, resize, collapse, zoom), icons and folders (by icon, by name), each project's
  Info window and README, the studio's Readme, Control Panel, the screenshot viewer.
- The shell: login, prompt, completion, history, clickable names, `browse`. The same shell is the desktop's Terminal.
- A page per project, its title and description, a sitemap.
- Accessibility (keyboard, screen readers, reduced motion), Lighthouse at 100 on accessibility, best practices and SEO.
- Story tests: every story rendered in Chrome under each phosphor and checked with axe (Storybook's Vitest addon), in `pnpm test`.
- A Content-Security-Policy that allows React Router's inline hydration script by hash.
- Launch on the domain.

### Phase 2: make it alive

The Lab (a Gero program running on `gero.wasm`, fetched the way gero-lab fetches it), a contact form that relays to an inbox,
link preview images, sound (generated in the browser, off by default).

### Phase 3: extras

A log fed from GitHub, gtx-16 carts if it gets a web build, a small original game, hidden things to find.

## Still to decide

The user answered phase-1.md's questions on 19 Nov 2026 ([the answers](phase-1.md#the-users-answers)). Nothing is left to decide
for Phase 1. Hundo's Link is hundo.quest, which serves
([checked on 20 Nov 2026](phase-1.md#still-open)).
