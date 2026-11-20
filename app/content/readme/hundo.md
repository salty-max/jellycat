# Hundo

Hundo is a set of completion guides for single-player games, one installable web app per game. There are six: Link's Awakening, Red Dead Redemption, Echoes of Wisdom, Dark Souls Remastered, Hollow Knight and Hollow Knight: Silksong, each on a subdomain of hundo.quest. A guide follows the game chapter by chapter, with a box to tick for each thing to get or do, and by default hides later chapters until the reader reveals them. Progress is kept in the browser, and the guides work offline.

## How it's built

The guides, the shared core, the component stories and the sync API are one pnpm workspace. `packages/core` is the app: the React 19 pages, components, stores and styles, and the function that builds a guide's whole Vite and Vitest config from its brand. A guide's folder holds its chapter data and config in plain TypeScript, its own tests, any panels of its own, and its look: a palette, two fonts, a corner preset, an icon and banners.

- Core reads a guide only through virtual modules (`virtual:guide/config` and two more) that the build points at the guide's folder. A guide reads core only through named subpath exports.
- Saves have one versioned format, validated on every load and import. Each guide's tests pin its storage keys, since a changed key would start every reader over.
- A missable must cite two sources on different hosts, which the tests check; anything less certain goes into the guide's `facts-to-verify.md`.

`services/sync`, deployed on its own at api.hundo.quest, lets a reader's devices share progress through a six-digit code, with no account. Progress is flattened to keys stamped by a hybrid clock, and the later stamp wins. In Redis a key's values are sorted-set members that are never rewritten, so two devices pushing at once can't overwrite each other. The merge code is one file, byte for byte the same in the guides and the server, and a test holds the two copies equal.

Visit counts carry no cookie and no id: a guide sends a few numbers, and the server adds them to daily totals and keeps nothing else. They are built to fit the exemption from consent that CNIL, the French regulator, gives audience measurement.

## How it's checked

- `pnpm check` runs lint, typecheck, tests and build for the packages a change reaches. CI runs them over every package, and `main` takes changes only through a pull request whose CI check passed.
- Core's shared test suites run against every guide, and each guide typechecks core against its own config.
- Every component story renders in Chrome under each guide's palette, in light and dark, and axe checks it; a violation fails the run.
- Lighthouse CI audits every guide's production build on each pull request, with accessibility, best practices and SEO held at 100.
- A sync test runs two simulated browsers against the real API handler on an in-memory store.

Work on the repository runs under the [harness](/projects/harness).
