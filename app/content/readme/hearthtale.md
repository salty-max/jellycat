# Hearthtale

Hearthtale is a World of Warcraft addon that keeps a journal for the player's character, and hearthtale.app, where the journal can also be read. Each stretch between two rests (a logout at an inn, in a city or by a campfire, or the first logout after four hours of play) becomes an entry in the first person, told differently by each race. On Hardcore, a death closes the journal with an epitaph. It runs on Classic Era, Hardcore, Season of Discovery and World of Warcraft: Forever.

## How it's built

The addon keeps a recorder, which stores facts, apart from a writer, which turns them into prose when the journal is read. The writer's sentences are data: Markdown files in `writing/`, each line tagged with the conditions it needs, a race's own lines beside them, and, for a quest with a story, a line on what its work was for. `scripts/build.ts` compiles them into one data file per game and checks every phrase.

- Game data comes from [wow-data](/projects/wow-data), the window from [addon-kit](/projects/addon-kit). One generated table holds how the game writes names (with or without "the", a plural), counted over its quest texts and NPCs' speech.
- The record is saved as ids wherever an id gives the name back, and the written journal is saved beside it word for word, so a finished entry keeps its words.
- A French journal is told again from the same facts. A line without its French fails the build, and the French tables ship as a second addon loaded on demand.

The site is a Bun workspace: a Hono API on Postgres, a React PWA, and a shared package mirroring the addon's saved file. The site never writes a journal; [Ravenpost](/projects/ravenpost) uploads it after a logout. Journals are private, owned through a Battle.net sign-in or a code typed in the game, and a share link leaves out the player's notes. Database scripts refuse a database off the machine unless given `--prod`, which the seed never takes, a rule a test enforces.

## How it's checked

- A simulated game client replays lives on both games, asserting every recording.
- The writer's test writes hundreds of imaginary lives: every sentence must be reachable, and a finished entry must not change when the next comes. A writer refactor keeps every journal byte for byte, and the audit plays each race from level 1 to 30 on the game's real quests.
- CI runs the addon's checks that need no other repository and the site's typecheck, lint, tests and build; a version tag reruns the addon's checks before publishing to GitHub, CurseForge and Wago.
- A daily job rebuilds the tables from wow-data's pins and, when one changes, opens a pull request with the journals compared before and after. A regenerated table must keep every id a saved file may hold.
