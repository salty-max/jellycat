# Palaver

Palaver is a World of Warcraft addon for Classic Era and World of Warcraft: Forever that replaces the game's quest and gossip windows with a panel beside the NPC, who stays in view. Space or Enter accepts or continues, Escape says goodbye, and the number keys pick a line or a reward. Its way of talking to NPCs follows the DialogueUI addon.

## How it's built

`Game.lua` reads the game's pages through the same calls Blizzard's windows make, each read in Blizzard's source, pinned in wow-data, before it changes. Buttons, headings and NPC lines stay the game's own, in the client's language.

`Core.lua` mutes Blizzard's windows at login, restored exactly by `/palaver off`. Escape, Goodbye, Decline or the panel's close button end a conversation; when Palaver steps the panel aside for a vendor, a trainer or a flight map, the conversation goes on. Keys act on release and only on the page they were pressed on, so a held Space never accepts the next quest, and on a long page Space first scrolls down (a setting, on by default), so the key never accepts a quest with its rewards unseen. A page that fails to draw goes back to Blizzard's handler.

- `Hud.lua` hides the interface during a conversation and restores it at once for a fight, a popup or a cinematic.
- `Camera.lua` plays DialogueUI's zoom on the speaker, saving every camera setting it changes so that after a crash the next login puts them back.
- `Rewards.lua` marks the reward that sells for the most and the best upgrade by Palaver's own rule (class stat weights against the gear worn), asking no other addon.

A quest's offer adds its level, kind (elite, dungeon, raid, PvP), place in its chain and suggested group size. `scripts/quests.ts` builds level, kind and chain from [wow-data](/projects/wow-data)'s databases into one Lua table per game; a chain follows the game's next-quest link alone, never a prerequisite. The window, panel and paper look come from [addon-kit](/projects/addon-kit)'s shared Lua.

## How it's checked

- `bun run check` runs the key binding check, the kit's copy check and the quest generator in `--check` mode, then `check:ci`: the language files, StyLua and selene, the simulation and the TOCs.
- The simulation runs in the kit's simulated game client, with Blizzard's windows as each client registers them and a scripted NPC behind the gossip and quest APIs, on Classic Era, Forever, a French client and the paper look.
- `RENDER=dir` writes the panel as HTML in its real colours for a look before a build, and a visual change is tested in the game.
- CI runs `check:ci` on every push to `main` and every pull request and diffs the release package against the addon's folder; a version tag runs it again before publishing to GitHub, CurseForge and Wago.
- A daily job rebuilds the quest facts from wow-data's pins; a change opens a pull request, merged by itself once CI passes.
