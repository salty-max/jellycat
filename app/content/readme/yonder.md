# Yonder

Yonder is an Explorers' League field journal for World of Warcraft, on Classic Era, Hardcore, Season of Discovery and World of Warcraft: Forever, that fills in as a character travels. Its expeditions are riddles in verse, solved on the spot by reaching a place, speaking to someone, reading something or making the gesture the verse hints at, and posters for rare creatures to track down. A bestiary, an atlas, a tab of finds and one of achievements hold the rest, with a naturalist's note for every family and find.

## How it's built

The authored text is Markdown: riddles and posters in `expeditions/<zone>.md`, family notes with their matching rules in `content/`, zone notes in `atlas/`, the finds' notes in `notes/`. `scripts/build.ts` sorts the original world's creatures into families (Forever's new ones are filed in the game when met) and writes one data file per game, keeping a paragraph marked `[classic]` or `[forever]` for that game alone. The game data comes through [wow-data](/projects/wow-data), the book's window through [addon-kit](/projects/addon-kit).

- A resolver, `scripts/expeditions.py`, places each object and creature from the spawns in wow-data (the CMaNGOS Classic database, and Questie's records for Forever's new island), cross-checked against Wowhead's points frozen there. It refuses a riddle that needs a kill, repeats a discovery in its zone, overlaps a quest without a recorded review, or sits by a creature hostile to one side, unwarned. Each riddle carries a danger line from the spawns around it.
- What a riddle is checked against ships only as salted hashes of 5-yard cells, sub-areas, keepers and gestures; the hints ship readable, and the texts a solved riddle unlocks are veiled.
- A gesture is caught by its emote token, never its text, and nothing solves in combat, from a flight or as a ghost.
- The journal saves the game's things by id, never by name, so every creature and place reads under the game's own name in the client's language, even after a switch. It reads in English and French.
- Sharing what the game tells of the world is opt-in, and [Ravenpost](/projects/ravenpost) carries it.

## How it's checked

- `bun run check` runs the scripts' Bun and Python tests, StyLua and selene, and a simulated client replaying a dwarf's first hunts on Classic Era and on Forever, where addons get no combat log and some values are secret.
- `scripts/riddle-solutions.test.ts` solves every riddle through the real Lua code under each client language, on both games.
- `scripts/expeditions_test.py` undoes a hand review's fixes and expects the resolver to find every finding again.
- CI runs the checks that need no other repository on every push to `main` and every pull request. A daily job regenerates the data from wow-data's pins, checks a new build's quests against every riddle, and merges once the checks pass; `saved-ids.json` keeps it from dropping an id a journal holds.

[Lorekeeper's Codex](/projects/lorekeepers-codex) shares Yonder's tooling and conventions, in another voice.
