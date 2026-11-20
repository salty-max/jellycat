# Farseer

Farseer is an installable web app that collects World of Warcraft blue posts (posts by Blizzard's developers and community managers, and its official news) from the US and EU English forums into a single feed. Readers filter it by game (Retail, Classic or Forever), topic, region and author, read a post beside the player message it answers, save posts for offline, and get push notifications matching their own filters. The app is in English and French.

## How it's built

It is a Turborepo of Bun workspaces: `apps/api` (Hono, Drizzle, Postgres), `apps/web` (React 19, Vite, Tailwind 4, TanStack Router and Query, vite-plugin-pwa) and `packages/shared`, the wire contract both sides import. It was built from [Lucarne](/projects/lucarne)'s template and shares its monorepo, stack and push code.

A tick every minute polls the US and EU forums' public blue trackers and pushes what's new; every 15th minute it also re-checks the ten latest hotfix, patch-notes, PTR and maintenance threads of the past week for edits. A fresh database is backfilled instead, with no pushes. In production the tick is a Vercel Cron call to a single function, and a lease row in Postgres keeps two ticks from running at once, so two instances never push the same post.

- Crossposts: two posts count as one when they share an author (the EU name's numeric suffix stripped), fall within 48 hours, and have near-identical titles and text as bags of words.
- Chatter: replies by community managers and other staff are left out of the feed when they sit in a player's thread or answer a player's post; their updates to Blizzard's own threads (hotfix entries, PTR notes) stay. Thread openers, developers and official news are never left out.
- Web Push is written without a library: VAPID and aes128gcm payload encryption on Web Crypto and `fetch`. Each notification is written on the server in the language its device stored, and subscriptions are accepted only for known browser push services.
- Forum HTML is sanitized with DOMPurify before it renders. Feed filters live in the URL, read marks and saved posts on the device, and the service worker answers API requests network first, so opened posts stay readable offline.

## How it's checked

- The project's rule is that typecheck, lint, tests and the web build pass before a change is done; there is no CI. A pre-commit hook runs ESLint on staged files, and commitlint holds messages to Conventional Commits.
- Bun's test runner covers classification, crosspost detection, the chatter rule, push filters and encryption, and the API routes through Hono's `app.request()`; the post renderer, `RichText`, renders under happy-dom with React Testing Library.
- `db:sim` drives the real notification path (filters, copy, encryption, delivery) against a fake push service with three subscriptions, checks which ones fire, then runs it again to prove a post is pushed only once.
