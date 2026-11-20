# WoWLocker

WoWLocker is an installable web app for following World of Warcraft Classic characters from a phone, with an addon that records what the public profile can't show. The site covers Classic Era, Hardcore, Season of Discovery, TBC Anniversary and MoP Classic, and the addon the first three. The addon adds a detailed timeline, session summaries, bags, bank and mail, zone maps of deaths and close calls, and offline reminders.

## How it's built

The site shares [Farseer](/projects/farseer)'s monorepo, stack and push code: a Hono and Drizzle API on Postgres, a React 19 web app and shared wire types. A scheduler tick refreshes from Battle.net the characters opened in the last 30 days, fallen ones once a day, and a pure diff turns each new snapshot into timeline events.

- The addon, in Lua 5.1, records events into its saved file, which the game writes at logout or `/reload`; [Ravenpost](/projects/ravenpost) carries that file to the site. The API matches characters by the Battle.net ids inside their GUID, never by name, accepts uploads only for characters a Battle.net login proved are the account's, and checks and clamps every field as untrusted data.
- Battle.net's API has no talent data for Classic, so the Classic Era and TBC Anniversary talent trees, like the interface textures and the fully explored zone maps, are built from the game's own files.
- A Battle.net login makes the account; the access token is never kept, and the session cookie is stored only as a SHA-256 hash. Every per-viewer answer goes through one privacy module: an owned character's bags, bank, mail, gold and position stay its owner's unless shared. Row-level security is on for every table, with no policies, so Supabase's public REST API serves none of them, and rate limits guard whatever costs a Battle.net call or a stored row.
- Production has no long-lived process: the web app on Vercel's CDN, the API in one function, the tick run by Vercel Cron under a database lease, and short-lived state in Postgres with expiry times.

## How it's checked

- CI on every push to `main` and every pull request runs typecheck, lint, tests and build, with integration tests of the upload and refresh lifecycle against a freshly migrated Postgres.
- The addon's simulation replays a game session under LuaJIT and asserts every recording. CI also builds the release zip with the BigWigs packager, publishing nothing, and checks it holds exactly the addon folder.
- `scripts/release.sh` bumps every version, runs the checks, commits, tags and pushes. The release workflow publishes the zip on GitHub and, only when the addon's version changed, CurseForge and Wago; `--hold` leaves the stores to a later run by hand.
- A pre-push hook refuses a tree without a passing check, and a scheduled job checks that `/api/status` answers, which needs a recent scheduler run.
