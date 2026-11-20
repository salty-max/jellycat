# Keyring

Keyring is a World of Warcraft addon that clears the minimap: other addons' buttons move into a drawer that opens from a key-shaped button on the minimap's ring, and the settings let the player leave any button where it was. One download covers Classic Era, Hardcore, Season of Discovery and World of Warcraft: Forever, in English and French. It carries none of addon-kit's shared Lua: it uses the game's own frames and look.

## How it's built

`Gather.lua` finds buttons through LibDBIcon's list and by name among the minimap's children: at login, shortly after, and whenever an addon loads or the drawer opens. It never takes the game's own buttons (they have secure global names), a protected frame (the game restricts those in combat), a map pin, or anything larger than 64 pixels.

- While a button is held, its addon's `SetPoint`, `ClearAllPoints`, `SetParent` and `SetAllPoints` do nothing, so neither the addon nor a LibDBIcon refresh can pull it back out; its strata and level stay above the drawer the same way. A button the player leaves out goes back as it was, its own methods restored, and its strata and level too wherever the game lets an addon read them.
- The drawer closes on the key, Escape or a click elsewhere, but not on a menu or tooltip that one of its buttons opened. `Bindings.xml` offers a key binding that opens and closes it, for a controller with no cursor on the minimap; nothing is bound until the player picks a key.

Keyring shares only tooling with [addon-kit](/projects/addon-kit): the folder finder, the scripts' languages and packaging libraries, selene's game globals and the StyLua config are stamped copies, `kit:check` fails one that drifts, and the release and the binding check run the kit's own scripts.

## How it's checked

- `bun run check` runs the key binding check and `kit:check`, then `check:ci`: the language files, StyLua and selene, the simulation on Classic Era and on Forever, and the TOCs.
- The simulation runs in a fake game of Keyring's own, with the game's buttons under secure names and LibDBIcon making its buttons as the library does. It plays a login among addon buttons, map pins and a protected frame, the drawer, the settings list, a reload and a French client.
- CI runs `check:ci` on every push to `main` and every pull request, then builds the release package with the BigWigs packager and diffs it against the addon's folder.
- A version tag runs the same checks and verifies the stores' tokens before one zip goes to GitHub, CurseForge and Wago; the stores can be held back for a test in the game.
