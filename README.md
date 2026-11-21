# Jellycat Studio

The studio's portfolio: Jelly-OS, a made-up operating system on a phosphor CRT. A desktop on computers, a page in the same
phosphor on phones, one page per project. [docs/plan.md](docs/plan.md) has the decisions and the phases, [docs/design.md](docs/design.md) the design rules.

## Layout

- `app/`: the site. `root.tsx` is the page shell and draws the OS on the home and project pages (`os/layout.tsx`: the phone's
  page under 768x520, the desktop from there, held while a text field has the focus), `routes.ts` the routes, `routes/` one
  module per route, `os/` the OS's parts (`os/phone/` the phone's page and its two dialogs, the viewer and the Control Panel's
  sheet; `os/desktop/` the desktop, whose Terminal is the shell, `os/shell/`), `app.css` Tailwind and the phosphor tokens.
- `app/core/`: what both layouts read. `projects.ts` is the project data (every fact from the project's own repository, its
  README or its code where the README is stale, a link perhaps from its GitHub homepage field, an unknown fact `-`),
  `studio.ts` the studio's Readme and `contact.txt`, `site.ts` the OS's name and the site's address, `readme.ts` the
  projects' READMEs, each a chunk of its own, loaded and parsed on first use.
- `app/content/readme/`: one README per project, `<slug>.md`, in a small Markdown subset (one `#` title, `##` headings,
  one-line paragraphs, one-level `- ` lists, code spans, links to `https://` or `/projects/<slug>`); `readme.ts` refuses
  anything else, naming the file and line.
- `public/`: files served as they are: the favicon, and `screenshots/<slug>/`, each project's pictures as AVIF and WebP, which
  `projects.ts` lists with their alt text and size.
- `e2e/`: Playwright tests against the production build, accessibility included: axe on whole pages (`axe.spec.ts`), the main
  screens' accessibility trees (`aria.spec.ts`), every app opened and closed with no mouse (`keyboard.spec.ts`), every tab stop's
  focus seen on screen (`focus.spec.ts`), and reduced motion (`motion.spec.ts`). The shell's tests (`browse.spec.ts`, the typed
  login) run in the desktop's Terminal; the phone's pages, viewer and sheet run on the phone project, with the real Esc.
- `.storybook/`: Storybook, with a phosphor switch in its toolbar.
- `__mocks__/`: Vitest's mock of zustand, which puts every store back to its first state after each test and story.
- `scripts/`: `serve.mjs` (the preview server), `look.mjs` (a mockup and a story side by side), `csp.ts` (the build step that
  writes each page's Content-Security-Policy) and `screenshots.mjs` (the projects' pictures: the web apps' live sites opened
  logged out in the system Chrome at a desktop and a phone size, or a picture taken by hand with `--from`, written to
  `public/screenshots/`; run by hand, never by the build).
- `mockups/`: the HTML mockups that settled the look. Not part of the build.
- `docs/`: the plan and the design rules.
- `harness/`, `harness.toml`, `.claude/`: the git hooks, the task board and the review helpers sessions work under
  ([CLAUDE.md](CLAUDE.md)).

## Scripts

You need Node 22.22.2 or later on 22, 24.15 or later on 24, or 26 (the packages' own floor; CI uses 26), and pnpm
(the version is pinned in `package.json`). The harness's hooks need [bun](https://bun.sh).

```bash
pnpm install
```

```bash
pnpm dev
```

```bash
pnpm check
```

`pnpm check` runs lint, typecheck, the tests and the build, as CI's first job does. The tests are Vitest projects: `unit` (jsdom)
and `stories:green`, `stories:amber` and `stories:white`, which run every story headless in the system Chrome, once per phosphor,
with axe failing the run on a violation. The others:

- `pnpm e2e`: builds, serves `build/client` on port 4173 (`scripts/serve.mjs`), and runs Playwright on a desktop and a phone
  viewport in the system Chrome. It serves on 127.0.0.1 and only tests that server, never whatever else answers on port 4173
  (another worktree's run, a `pnpm preview`, another project's `vite preview`): when it can't have the port, it fails once the
  build is done.
- `pnpm lighthouse`: Lighthouse CI on `build/client` (run `pnpm build` first) with the phone's preset, held to `lighthouserc.json`;
  `pnpm lighthouse:desktop` the same pages on Lighthouse's desktop preset, held to `lighthouserc.desktop.json`. Both want 100 in
  accessibility, best practices and SEO, and 0.9 in performance; CI runs both.
- `pnpm storybook`: the component stories on port 6006.
- `pnpm preview`: serves the production build the way Vercel does (`scripts/serve.mjs`): a file at its path, a folder's
  `index.html`, and `404.html` with a 404 status for anything else.
- `node scripts/look.mjs`: screenshots a mockup's frame and a story at 652x480 and 1:1, and writes them side by side, with 4x crops,
  to `.cache/look/`. It starts its own mockups server and Storybook on free ports. `--mockup`, `--selector`, `--story`,
  `--phosphor`, `--size`, `--crop` and `--name` change what it compares (by default the desktop mockup's `#jd` and the boot screen).
  It waits for the mockup's boot screen or typed login to end (`--boot keep` captures it); `--mockup-run` runs a script in the
  mockup first (`"A.readme()"` opens a window, `"page('hundo')"` the shell's project page); `--page /projects/hundo` compares a page
  of the build instead of a story (after `pnpm build`), and `--type 'ls\n'` and `--wait-for` bring the story or the page to a state.
  Chrome keeps its scroll bars (Playwright's `--hide-scrollbars` is dropped), so a look shows the 1-bit ones (on a system that always draws scroll bars, unstyled areas show Chrome's own too).
- `pnpm build-storybook`: the static Storybook, which CI builds too.

## Build

`pnpm build` writes a static site to `build/client`: an HTML file for each path listed in `react-router.config.ts`, and `404.html`,
the not-found route prerendered once and moved there by the config's `buildEnd` (which also deletes React Router's unused SPA
fallback). Vercel serves `404.html` with a 404 status at any address with no file (except under `/api`, where Vercel's built-in
error route answers in plain text; the site has no `/api`), so a typo is a real 404 and not the app's shell. `build/server` is
only used during the build.

The same `buildEnd` writes `sitemap.xml` (the home page and a page for each project in `app/core/projects.ts`, on `SITE_URL`) and
`robots.txt` (everything allowed, the sitemap named). `/projects/:slug` is prerendered for each project; its loader awaits the
project's README at build, and a slug with no project throws a 404 that the root `ErrorBoundary` draws as the not-found screen.

Each page carries its Content-Security-Policy in a `<meta http-equiv>`, written by `scripts/csp.ts` as the last step of
`buildEnd`, so `404.html` gets one too. React Router and React start each page with inline scripts (the hydration data, the module
imports, scroll restoration, React's streaming code), a different set on each page, and a static site has no server to add a
nonce. So the step hashes each inline script (the bytes between the tags) and lists the SHA-256s in `script-src`: those run, and
no other inline script does. The meta goes right after `<meta charset>`, before the first `<script>`, since a policy only covers
what the browser reads after it. The build fails when a page has no single place for it, or a script tag the step can't read. The
policy allows scripts, fonts, fetches and form posts from the site only, plus those hashes; styles from the site and inline ones
(a `style` prop needs nothing new); images from the site and `data:`; no plugins (`object-src 'none'`); `base-uri 'self'`.
`pnpm dev` runs without it. `e2e/csp.spec.ts` opens every page of the build in Chrome and fails on a violation, on a page that
doesn't hydrate, or on a policy that lets an inline script added after load run; it also feeds the step made-up pages that each of
its checks has to refuse.

The React Router packages are pinned to one exact version together: pnpm holds back releases under a day old, and the three
packages have to match.

`vercel.json` serves `build/client` and sets the security headers. It uses `routes`, not `headers`, so a missing asset never gets
the year of cache: the year on hashed `/assets/*` is set in the `hit` phase, which only runs for a file that exists. A `headers`
rule matches by path alone and would put that year on the 404
([hundo's deploy notes](https://github.com/salty-max/hundo/blob/main/docs/deploying.md#pitfalls) have the side-by-side test).
`vercel build` writes the table Vercel will run to `.vercel/output/config.json`: Vercel adds its own error route to `/404.html`.

The `Content-Security-Policy` header in `vercel.json` carries only what a meta tag can't: `frame-ancestors 'none'`, with
`object-src 'none'` and `base-uri 'self'`. A browser applies both policies, so the header never names `default-src`, `script-src`
or `style-src`: it would block the inline scripts and styles the meta allows. `scripts/serve.mjs` and Lighthouse CI don't send
`vercel.json`'s headers, so only a deployed page shows it (`curl -sI`). On preview deployments Vercel adds its toolbar's script
from `vercel.live`, which the policy doesn't allow: a preview's console should show one CSP error and no toolbar (not seen yet:
every push so far went to `main`). Production has no toolbar. Allowing it would loosen every page's policy, production's included.

What the first production deploy answered (19 Nov 2026, `899e915`, whose `vercel.json` still had an error-phase `no-store` route
on `/assets`, removed since because it never showed): `/` 200; `/no/such/page` and `/assets/nope.js` 404 with the not-found page
and `public, max-age=0, must-revalidate`; a real `/assets/*.js` 200 with `immutable`; the security headers on all of them, 404s
included. Vercel installed with pnpm 11.18.0 (from `packageManager`) on Node 26.x.

## Hosting

Vercel project `jellycat` on the team `jellycat`, connected to `salty-max/jellycat`, production branch `main`, Node 26.x. Production is
<https://jellycat.fr>, the apex canonical; `www.jellycat.fr` redirects to it. The vercel.app address still serves, with its canonicals
pointing at jellycat.fr. A push to `main` deploys production; a push to any other
branch gets a preview. `engines` caps Node at 26 so a new major never arrives by itself.
