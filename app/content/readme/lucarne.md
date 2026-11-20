# Lucarne

Lucarne is an installable web app that lists football fixtures with the French TV channel carrying each match where one holds the rights, in competitions including Ligue 1, 2 and 3, the French cups, the Premier League, La Liga, the Bundesliga, UEFA's club competitions, the Nations League and the World Cup. It adds live scores, match pages and push alerts for the matches a reader flags or their followed teams play. Its interface revives broadcast teletext: three-digit page numbers, four coloured FastText keys, the seven teletext colours and a self-hosted teletext typeface. It is in French and English, on Paris time.

## How it's built

It is a Turborepo of Bun workspaces: `apps/api` (Hono, Drizzle, Postgres), `apps/web` (React 19, Vite, Tailwind 4, TanStack Router and Query, vite-plugin-pwa) and `packages/shared`, the wire types both sides import so the contract can't drift. One Bun process serves the JSON API, the built app and the scheduler from one origin, with no separate front-end host and no CORS.

- Broadcasters are mostly a data table: French rights are sold almost entirely by competition, so a match's channel resolves from rules bounded by start and end dates. Ligue 1's split rights resolve to both channels as partial rules, and a per-match override table takes precedence when filled. No channel is hard-coded.
- Fixtures and scores come from API-Football under one daily request budget. A single `live=all` request each minute updates every live score. During play, events and statistics are refreshed only for matches on someone's radar; lineups, predictions and post-match details are fetched for every match under the same budget, and a reserve keeps the score poll running on the busiest days. Browsers read only the app's own database, so visitors cost no quota.
- Each minute, a daily or weekly job that missed its slot while the host was asleep or down runs late.
- Web Push is written on Web Crypto and `fetch`, with no library. Each notification is written on the server in the language its device stored, titled with the fixture so alerts from simultaneous matches stay apart.

## How it's checked

- CI on every push to `main` and every pull request runs typecheck, lint, tests and build, all four even when an early one fails, plus shellcheck over the shell scripts.
- Bun's test runner covers the extracted logic (broadcaster resolution, budget and gating, match status, push delivery) and the routes' auth and fallbacks through Hono's `app.request()`; components render under happy-dom with React Testing Library.
- `db:sim` drives the real poller jobs against a faked API-Football through a whole match, from kickoff to full time and ratings, checking the database and the pushes at each step.
- A pre-commit hook runs ESLint on staged files, and commitlint holds messages to Conventional Commits.
