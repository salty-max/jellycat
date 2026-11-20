# Lorekeeper's Codex

Lorekeeper's Codex is a World of Warcraft addon: a book of the world's history that the player fills in by playing. A place entered, a figure met, a creature killed, a quest finished or a book read can each unlock a page, written as a note from Archesonus, Royal Historian of Ironforge; a Horde character's copy adds margin notes from Parqual Fintallas of the Undercity. A Library keeps the texts the character reads, and a Soundtrack tab collects the game's music. It runs on Classic Era, Hardcore, Season of Discovery and World of Warcraft: Forever, in English and French.

## How it's built

Each page is a Markdown file under `content/`, its unlock rules in its front matter: an area, a creature met or killed, a quest, a reputation, a map position, a text read. A paragraph or an unlock can belong to one game only. `scripts/build.ts` checks the ids, the rules, the links between pages and the place names, then writes one content file per game.

- Unlocks work in every client language: place names in the pages resolve to area ids from the client's tables, through [wow-data](/projects/wow-data), and a book is known by its title in every language. Where a page was found is saved as ids.
- The Library copies a text in full from the game's own reader, one page per frame. Letters written by players are never copied.
- Finds, the Library's texts among them, go into one codex shared by the account's characters; a Hardcore character keeps its own.
- `scripts/when.ts` gives the earliest moment a page can unlock and what follows it in the game: a writer's check that a page tells no more than the player has seen.
- The lore stops at the original game, Forever's own pages drawing on Forever's texts, and period texts win over later retellings.

The windows and achievements come from [addon-kit](/projects/addon-kit). Each translated page is stamped with the hash of the English it came from, so a changed English page shows its translations as stale.

## How it's checked

- `bun run check` lints the Lua, rebuilds the content and language files, and fails if a committed one differs.
- A simulated game client replays a session on both games; on the paper look, it checks that every text reads at 4.5 to 1 contrast.
- CI runs these checks and packs the release zip without publishing; a version tag runs them again before publishing to GitHub, CurseForge and Wago.
- A daily job rebuilds the areas, music, texts and portraits from wow-data's pins and opens a pull request when one changes, merged once its checks pass. A regenerated table must keep every id a saved find may hold.

Its sister addon, [Yonder](/projects/yonder), shares its tooling and conventions.
