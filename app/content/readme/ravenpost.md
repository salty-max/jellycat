# Ravenpost

Ravenpost is a small desktop app for macOS and Windows that uploads what some of the World of Warcraft addons on this site save. The game writes an addon's file only at logout or `/reload`; a few seconds later Ravenpost sends each character's journal to [Hearthtale](/projects/hearthtale), the WoWLocker addon's file to [WoWLocker](/projects/wow-locker), and, for players who opt in to sharing in Hearthtale, Lorekeeper's Codex, Yonder or Second Wind, what the game showed them of the world to the addons' shared database. It runs from the menu bar or the tray.

## How it's built

The core is Go; the window is React 19 in the system's own webview through Wails, so no browser is bundled.

- Sync: Ravenpost checks the saved files' times every 3 seconds and uploads only when a file's hash, or the player's selection, changed. Hearthtale's site gets only the fields it reads. Saved files are parsed as data, never executed.
- Sign-in: a local listener, Battle.net in the browser, then a two-minute code bound to a secret the app keeps (PKCE's way), traded over HTTPS for a token, so the browser's history holds no token. The same address carries a passport signed with Ed25519, good for ten minutes and one use, which Hearthtale checks with the public key in its own code to give Ravenpost its upload token there.
- Sharing: the addons' opt-in collector, part of [addon-kit](/projects/addon-kit), keeps quests' texts, creatures, NPCs' lines and loot in an account-wide file in each of those four addons. Ravenpost sends only the entries new or changed since the last upload, and never the player's name, class, race or chat. They wait in Ravenpost's inbox, a Hono server that keeps uploads as files in a private store, with no database, until [wow-data](/projects/wow-data)'s daily job merges them.
- Windows builds are unsigned, so the app never starts PowerShell, `cmd` or any other script host; links open through a direct Win32 call. A release build is reproducible: the same commit gives the same file.
- A daily ping carries only a random install id (the inbox keeps its hash), the version, the system, which links are made and how many addons share. The app never updates itself, and its window is in English and French.

## How it's checked

CI runs these on a macOS runner for every push to `main` and every pull request. `scripts/check.sh` runs all but `govulncheck`, and a pre-push hook refuses a tree without a passing run of it:

- The window's typecheck and build, and the generated TypeScript bindings, which must match the Go service.
- `gofmt`, `go vet` for macOS and for Windows, and `go test`, whose tests never touch the machine's own config or login items. The parser is tested on a saved file written by WoWLocker's addon simulation.
- The inbox's typecheck and tests, and the download page's Astro check, build and content security policy check.
- `govulncheck` for both targets, failing on any reachable Go advisory.
