# Primer

Primer is a class guide for World of Warcraft, on Classic Era and World of Warcraft: Forever, read in its own window between fights. For the character's class, level and build it gives the opening and loop of spells to press, the next talents to pick, and what the build is for, each line with its reason. Every class has a guide on Forever; on Classic Era the Warrior, the Paladin and the Mage do. It reads nothing in combat and sends nothing.

## How it's built

The guide is data, not code: one hand-written file for each class and game it covers, `content/<game>/<class>.json`, with its builds, talent paths and level stages. `scripts/guide.ts` turns them into the addon's Lua; no code is written per class, and a stale generated file fails the check.

- Facts come from [wow-data](/projects/wow-data)'s databases, by id: the generator checks every spell's name, level and place in the class's book, and every talent's ranks and prerequisites. A fact the tables lack is written as the guide's own and marked so in the data, or left out.
- `facts.lock.json` records every fact a build read. When a patch moves one, the run fails naming the build and the fact, until a person rereads and clears it.
- A character's build is read by feasibility, not by the tree with the most points: a build stays open as long as the points left can still fill its tree. A pick holds until the points can't reach it, and a drift is said once, never acted on. On Forever the level-10 question is the spec; the role follows.
- Forever's builds claim no optimum: a talent order is "the common choice", with its price, and `scripts/meta-lib.ts` bans words such as best, optimal and meta.

## How it's checked

- Tests play Primer in [addon-kit](/projects/addon-kit)'s simulated game client, made strict: it refuses a call that the documentation in Blizzard's pinned interface source refuses, naming the function and the argument.
- A matrix plays every class with a guide at eight levels from 1 to 60 on every tab, clicks everything shown, then levels up, respecs and fights. A case fails on a Lua error, a refused call, cut text, a missing icon or any read of the game in combat.
- A Forever run answers each of the test game's calls with secret values, one at a time, flagged or not, and the window must not raise an error.
- CI runs the checks that need no other repository on every push to `main` and every pull request, and compares the BigWigs packager's release package with the addon's folder.
- A daily job rebuilds the guide from wow-data's pins, opens a pull request when a file changes and merges it once its checks pass; a moved fact fails it first. `saved-ids.json` keeps a regeneration from dropping a build id a character holds.
