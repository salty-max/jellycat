# Mealbook

Mealbook is a World of Warcraft addon for cooks, on Classic Era and World of Warcraft: Forever. Each recipe the character knows gets a page written by its side's chef, Kendor Kabonka in Stormwind or Eunice Burch in the Undercity, above the game's facts about the dish. A road plans the climb to 300, a Hunts tab lists the recipes no shop of the side keeps, and an ingredient's tooltip names the known dishes it goes into. It reads in English and French.

## How it's built

`scripts/recipes.ts` builds each game's recipes from [wow-data](/projects/wow-data)'s databases: every dish of the cooking skill line its world can teach, its ingredients, the skill it is learned at and where its colour changes, each recipe's sellers, droppers and quests, the side each vendor serves, and where each ingredient is sold, dropped, fished or gathered. Chapters are kept by hand; the script refuses a dish without one.

- The road follows the game's skill-up rule (orange always gives a point, grey never, the chance falling in between) and picks the surest recipe at each point, counting casts as one over the chance. It adds a recipe to learn only when its chance of a point beats the best known recipe's by more than 0.1, and stops at each cap to say where the next rank is learned.
- A recipe is a hunt when no shop of the side has it but a limited stock, a drop or a quest does, or only the other side gets it and it trades at a neutral auction house.
- Every dish has a page from both chefs. `scripts/pages.ts` checks each page's length, refuses a semicolon or another dish's ingredient, and flags a translation whose English changed since it was stamped.
- The saved book keeps ids only, and every game name is shown in the client's language.

The window and achievements come from [addon-kit](/projects/addon-kit)'s shared Lua.

## How it's checked

- A simulated game client plays a recipe learned, dishes cooked, the road and every tab on both games and in French. It holds the achievement check that runs after every dish cooked under 32 KB of garbage.
- On the paper look, the simulation holds every skill colour at 3 to 1 contrast and distinct from the others.
- CI lints the Lua, checks the language files and runs the simulations and script tests; a version tag runs them again before the release goes to GitHub, CurseForge and Wago.
- A daily job, with wow-data's databases at hand, rebuilds the recipes, pages and language files from its pins, runs the full check, the recipes' and pages' checks among it, and opens a pull request when a file changes. A regenerated table must keep every id a saved book may hold.
