# Goodwill

Goodwill is a World of Warcraft addon for Classic Era and World of Warcraft: Forever that shows each faction's road to Exalted. For each faction the character can raise, the addon's book shows the distance to the next standing, the turn-ins in the bags and bank, the quests still open, the kills that still count and what each standing unlocks. Factions with a voice of their own tell a little more of their story at each new standing. It comes in English and French.

## How it's built

`scripts/factions.ts` builds one Lua table per game from [wow-data](/projects/wow-data), for the factions listed by hand in `data/factions.json`: the quests that raise each and what they require, the repeatable turn-ins, the kills and where they stop counting, what each standing unlocks. The client's Faction table adds how sister factions share reputation and where each race and class starts. The book lists a faction once the character gains above that start, and the character's own capital from the first login.

Saved data keeps ids only, and names come by id in the client's language, never matched in English. `saved-ids.json` lists the tables whose ids a saved book may hold, and the check fails a regeneration that drops any of those ids.

The chapters are Markdown files, up to six a faction: start, Friendly, Honored, Revered, an aside halfway to Exalted, and Exalted. A paragraph tied to a quest shows once the reader has turned it in, or only until then. `docs/voices.md` holds the rules (a voice guarded at first and plain at Exalted, every fact from the game) and a card per voice. Every faction's chapters but the Darkmoon Faire's name the [Lorekeeper's Codex](/projects/lorekeepers-codex) pages they must not echo, and are read against them.

`scripts/chapters.ts` builds one Lua file per language. It refuses a chapter that breaks the house style (a semicolon, a figure in the prose) or marks a repeatable quest, which is never flagged done, a faction missing one of its chapters, and a translation whose marked paragraphs differ from its English; it names each translation whose English changed since it was stamped. The settings, welcome page and achievements run on [addon-kit](/projects/addon-kit)'s shared Lua.

## How it's checked

- `bun run check` runs the key binding check, the kit's copy check, the saved-ids check and both generators in `--check` mode, then `check:ci`: Bun tests, French typography, the language files, StyLua and selene, the simulation and the TOCs.
- The simulation plays it in the kit's simulated game client: rising standings, opening chapters, quest-tied paragraphs and the road with bags and bank, on Classic Era, Forever, a French client and the paper look.
- CI runs `check:ci` on every push to `main` and every pull request and diffs the release package against the addon's folder; a version tag runs it again before publishing to GitHub, CurseForge and Wago.
- A daily job reruns the generators from wow-data's pins and opens a pull request when a file changes, merged by itself once CI passes.
