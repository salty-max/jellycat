# wow-data

wow-data is the build-time data pipeline behind the World of Warcraft addons on this site, all but Keyring. It turns the game client's own tables and two community databases into a SQLite database for each game, Classic Era and World of Warcraft: Forever, which the addons' scripts query to generate their data files. Nothing of it ships in an addon.

## How it's built

`pins.json` pins the three sources: the client's own tables at a build, in every client language; QuestieDB at a commit, merged by Questie's own engine; and the cmangos Classic database for what Questie lacks, such as books and loot odds. Names Questie doesn't translate come from Wowhead, fetched once and frozen in the repository. Each file downloads once into a shared cache, and no addon fetches its own.

Every link in the schema is the game's id; names live in one table, in every language, and every row names its source. A build stops rather than publish less than it should: a failed download, a language holding under 95% of English's names for a kind, a frozen file missing.

Daily GitHub Actions jobs keep it current:

- Pins: a pull request when the client's builds move within their product and major version, merged by itself once both databases build and pass their tests; the new databases then ship as a GitHub release.
- Game data: each addon's job (Keyring has none) regenerates its files, opens a pull request only when one changes, and merges once its CI passes; a release to players stays a hand step. [addon-kit](/projects/addon-kit)'s `ids.ts` fails the job first if an id a player's saved file holds would be lost.
- Players' facts: what players who opted in saw in the game, sent through [Ravenpost](/projects/ravenpost). A review drops any line with a link, markup, escape codes, a value out of bounds or an order to the reader, and holds free text until two players have seen it. Who saw a fact is kept as a hash of the account and the fact, so no one's facts can be tied together, and facts fill only what no source has.

The explorer, React on a Bun server, finds any name in eleven languages, gives each quest, creature, item and zone a page, draws positions on the client's maps and has a read-only SQL console.

## How it's checked

`bun run check` typechecks and runs the tests. The database tests hold both databases against facts from the game, and another runs the review's text rules over the game's own texts and fails if they drop one in a thousand. Those run where the databases are built: before each release of them and before the Pins job merges. CI runs the check and the explorer's typecheck and build on every push to `main` and every pull request.

Work on the repository runs under the [harness](/projects/harness).
