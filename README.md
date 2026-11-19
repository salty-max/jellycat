# Jellycat Studio

The studio's portfolio: Jelly-OS, a made-up operating system on a phosphor CRT. A desktop on computers, a shell on phones, one
page per project. [docs/plan.md](docs/plan.md) has the decisions and the phases, [docs/design.md](docs/design.md) the design rules.

## Layout

- `app/`: the site. `root.tsx` is the page shell, `routes.ts` the routes, `routes/` one module per route, `os/` the OS's parts,
  `app.css` Tailwind and the phosphor tokens.
- `public/`: files served as they are (the favicon).
- `e2e/`: Playwright tests against the production build.
- `.storybook/`: Storybook, with a phosphor switch in its toolbar.
- `mockups/`: the HTML mockups that settled the look. Not part of the build.
- `docs/`: the plan and the design rules.
- `harness/`, `harness.toml`, `.claude/`: the git hooks, the task board and the review helpers sessions work under
  ([CLAUDE.md](CLAUDE.md)).

## Scripts

You need Node 22.22.2 or later on 22, 24.15 or later on 24, or Node 26 (the packages' own floor; CI uses 26), and pnpm
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

`pnpm check` runs lint, typecheck, the unit tests and the build, as CI's first job does. The others:

- `pnpm e2e`: builds, serves `build/client` on port 4173 (`scripts/serve.mjs`), and runs Playwright on a desktop and a phone
  viewport in the system Chrome.
- `pnpm lighthouse`: Lighthouse CI on `build/client` (run `pnpm build` first), held to `lighthouserc.json`.
- `pnpm storybook`: the component stories on port 6006.
- `pnpm preview`: serves the production build the way Vercel does (`scripts/serve.mjs`): a file at its path, a folder's
  `index.html`, and `404.html` with a 404 status for anything else.
- `pnpm build-storybook`: the static Storybook, which CI builds too.

## Build

`pnpm build` writes a static site to `build/client`: an HTML file for each path listed in `react-router.config.ts`, and `404.html`,
the not-found route prerendered once and moved there by the config's `buildEnd` (which also deletes React Router's unused SPA
fallback). Vercel serves `404.html` with a 404 status at
any address with no file, so a typo is a real 404 and not the app's shell. `build/server` is only used during the build.
`vercel.json` serves `build/client` and sets the security headers. A Content-Security-Policy comes in Phase 1, once the inline
hydration script's hash can be allowed.

The React Router packages are pinned to one exact version together: pnpm holds back releases under a day old, and the three
packages have to match.
