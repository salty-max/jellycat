# Yours Truly

Yours Truly is a World of Warcraft addon for Classic Era and World of Warcraft: Forever in which the people whose quest chains a character finished write to the character, each in their own voice, about what the chain changed for them. A letter spends a while in the post, then waits sealed at a mailbox, and a book keeps every letter received. It reads in English and French.

## How it's built

No addon can put mail in the game's mailbox, so a letter appears in a panel beside the mail window, laid out like the game's inbox: a row per letter, a seal to break, Open all. A letter's only notice is the game's own mail icon on the minimap, or a small one on the book's minimap button where the game's can't be shown: no chat line, no pop-up.

- Turning in a letter's last quest posts it, and a mailbox delivers it once it has spent fifteen minutes of play in the post, one letter a visit, two when more than three wait. The time is kept by the addon's own clock, since asking the game for the time played prints a line in the chat. Letters earned before installing come as a backlog, delivered the same way.
- Each writer is one Markdown file, `letters/<zone>/<writer>.md`: the ids of the letter, its anchor quests, the writer and the place, then the writer's card (the voice, what they never say) and the letter.
- Who the writer is, what the player did and what came of it are the game's, from the anchor's quests in [wow-data](/projects/wow-data); the writer's life since is invented, small and off-screen. Nothing is enclosed, nothing is asked of the player, and no enemy the game brings back is called gone.
- `scripts/letters.ts` checks each anchor, writer and place in each game's database, works out who can earn the letter, and writes the Lua. It refuses a semicolon, a token the game lacks, a body outside 70 to 180 words, game words such as "quest", and times a late letter would break, such as "yesterday".

## How it's checked

- A simulation in [addon-kit](/projects/addon-kit)'s game client turns a chain in, waits out the post, breaks a seal, fills in the player's name, holds back the other side's letters and delivers a backlog, on both games and on a French client.
- Bun tests cover the French typography check and the translation stamps; StyLua and selene lint the Lua. Each translation is read cold by a reviewing agent, then by a person.
- CI runs the checks that need no other repository on every push to `main` and every pull request. A daily job rebuilds the letters from wow-data's pins and runs the full check, the letters' own among it; `saved-ids.json` keeps it from dropping a letter id a character holds. A version tag publishes one zip for both games on GitHub, CurseForge and Wago.
