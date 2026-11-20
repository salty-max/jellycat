# Second Wind

Second Wind is a World of Warcraft addon that writes a debrief once a fight that nearly killed the character, or did, is over: a health graph, the largest hits, and the emergency spells and items used or left ready. From the third debrief on, it shows what the close calls share. Nothing appears in combat. It runs on Classic Era, Hardcore, Season of Discovery and World of Warcraft: Forever, in English and French.

## How it's built

The recorder keeps each fight's foes, hits, heals, health, casts and control lost, and what was ready when health first fell below half. Outside duels and battlegrounds, a fight that drops below the close-call threshold or ends in a death becomes a debrief, and every other fight is only tallied. Reading a debrief is a set of pure functions: the facts, then lessons that are rules over those facts (three foes at once, a guard unused, a fall from half health to the low point in three seconds), the two weightiest told. Patterns count traits across debriefs and set them against the tally of all fights. The voice gives counts, never advice.

- Emergency spells are known by id at any rank, and each tool counts only where it applies: a protection potion only if harm of its school came, a bandage only after a long enough lull.
- On Forever the combat log is closed to addons and the character's health is a secret value. Second Wind rebuilds health from each hit and heal the game reports, anchored on the game's own low-health warning at 35% or on the death recap, and reads the damage meter once combat ends; a debrief says when a health value is an estimate. `docs/forever.md` records the research and measurements, and `/wind probe` reports what the game exposed in the next fight.
- Debriefs save ids rather than game names, named again in the client's language at each login.

Creature portraits and names come from [wow-data](/projects/wow-data), the window from [addon-kit](/projects/addon-kit).

## How it's checked

- A simulated game client replays fights as the game sends them: hits, heals, stuns, a death with its recap, the combat log on Classic only and secret health on Forever. It runs on both games, on the paper look and as a French client, and each new behaviour is added with its replay.
- CI lints the Lua, checks the language files and runs the simulations; a version tag runs them again before the release goes to GitHub, CurseForge and Wago.
- A daily job rebuilds the creature and spell tables and the names in every language from wow-data's pins and opens a pull request when one changes. A regenerated table must keep every id a saved debrief may hold.
