# addon-kit

addon-kit is the shared Lua kit of the World of Warcraft addons on this site, and the scripts that run across the addons' repositories. Nine of the addons carry the kit: [Hearthtale](/projects/hearthtale), [Lorekeeper's Codex](/projects/lorekeepers-codex), [Yonder](/projects/yonder), [Second Wind](/projects/second-wind), [Palaver](/projects/palaver), [Mealbook](/projects/mealbook), [Goodwill](/projects/goodwill), [Yours Truly](/projects/yours-truly) and [Primer](/projects/primer). It gives their books one look with a theme each, and the parts every addon needs: events, the pieces of a window, the banners for a deed done, each character's settings and a welcome page.

## How it's built

Each addon commits a copy of `Kit.lua`, loaded into its own namespace, so two addons on different kit versions never clash and players install nothing extra. `kit:sync` writes the copy under a stamp line naming the kit commit it came from, with the kit's pictures, translations and the scripts' shared libraries. `kit:check` fails a copy that differs from the kit at its stamp, and the sync refuses kit code that isn't committed and pushed. [Keyring](/projects/keyring) takes the scripts alone.

The kit's words are translated once and copied into each addon, and the shared locale code refuses a translation that loses a colour code, a line break or a picture.

The kit also holds the addons' test battery: a mock of the client, a strict layer that refuses what Blizzard's API documentation (at a pinned version) says the client refuses, and a driver that makes the game's calls answer, one at a time, with the secret values of World of Warcraft: Forever.

The scripts:

- `package-lib.ts` builds one test zip that every game loads, each from its own TOC, and checks the TOCs: every file they load present and tracked by git, every Lua file loaded.
- `release.sh` wants an explicit version and a clean `main` in sync with origin, checks that no saved id is lost since the last release, runs the whole check, then pushes `main` and the tag together or not at all, for GitHub Actions to publish.
- `ids.ts` stops a data regeneration from dropping an id a player's saved file holds.
- `preflight.ts` checks, before a release, everything a script can (each TOC against [wow-data](/projects/wow-data)'s pinned builds, the store page, translation coverage, CI) and changes nothing.
- `store.ts` puts each addon's store page and summary on CurseForge and Wago, and its description on GitHub, a dry run first.

## How it's checked

`bun run check` runs StyLua, selene with the addons' lint rules, the kit's Lua tests in LuaJIT and the Bun tests; a push wants a passing check stamped on the tree. The Lua tests drive the kit's pieces against stand-ins for the game (the select, the banners, events, the key binding) and assert, for several themes, that text on the paper look keeps at least 4.5 to 1 contrast; each addon's simulation tests the rest. `release.test.ts` plays each release case in scratch repositories.

The addons' copy of the [harness](/projects/harness) tools lives here too, stamped from the harness repository: a hand edit fails the check.
