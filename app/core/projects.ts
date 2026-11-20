// The projects on the site. Every fact comes from the project's own README (Link may come from its GitHub homepage
// field, or for Hundo from the user's word, docs/phase-1.md); an unknown fact is "-". The file system, the shell, the
// desktop and the pages are all built from this list.

/** The folders under `projects/`, in the order the OS lists them. */
export const FOLDERS = ["web", "addons", "engines", "tools"] as const;

export type Folder = (typeof FOLDERS)[number];

/** A folder's name as the desktop and `browse` show it. */
export const FOLDER_NAMES: Record<Folder, string> = { web: "Web", addons: "Addons", engines: "Engines", tools: "Tools" };

export interface Screenshot {
  /** The picture's path from the site's root, without extension: `<src>.avif` and `<src>.webp` both exist. */
  src: string;
  /** The screen it was taken on. */
  size: "desktop" | "phone";
  /** What the picture shows. */
  alt: string;
  width: number;
  height: number;
}

export interface Project {
  /** The project's address (`/projects/<slug>`), its directory's name (`projects/<folder>/<slug>/`) and its README's file name (`app/content/readme/<slug>.md`). */
  slug: string;
  name: string;
  folder: Folder;
  /** What it is, in a word or two: "Web app", "WoW addon". */
  kind: string;
  description: string;
  /** What it is built with, comma-separated. */
  stack: string;
  /** The project's own site, or "-". */
  link: string;
  /** Its public repository, or "-". */
  source: string;
  screenshots: readonly Screenshot[];
}

const github = (repo: string) => `https://github.com/salty-max/${repo}`;

export const PROJECTS: readonly Project[] = [
  {
    slug: "hundo",
    name: "Hundo",
    folder: "web",
    kind: "Web app",
    description:
      "Spoiler-aware, installable completion guides for single-player games: one app per game, all built on one shared core.",
    stack: "React 19, Vite, Vercel, Upstash Redis",
    // The user's word: "I'll deploy hundo.quest". It answers DEPLOYMENT_NOT_FOUND until then; F2 checks it serves
    // (docs/phase-1.md, Still open).
    link: "https://hundo.quest",
    source: github("hundo"),
    screenshots: [
      {
        src: "/screenshots/hundo/koholint-desktop",
        size: "desktop",
        alt: "Koholint, the Link's Awakening guide: Tail Cave, chapter 1, the rest hidden",
        width: 1440,
        height: 900,
      },
      {
        src: "/screenshots/hundo/lordran-desktop",
        size: "desktop",
        alt: "Lordran, the Dark Souls Remastered guide: chapter 1, with what to do next",
        width: 1440,
        height: 900,
      },
      {
        src: "/screenshots/hundo/koholint-phone",
        size: "phone",
        alt: "Koholint on a phone: chapter 1, Tail Cave, and the next three things to get",
        width: 780,
        height: 1688,
      },
    ],
  },
  {
    slug: "farseer",
    name: "Farseer",
    folder: "web",
    kind: "Web app",
    description:
      "Every World of Warcraft blue post from the US and EU forums in one installable app, with filters and push notifications.",
    stack: "React 19, Vite, Tailwind 4, Hono, Postgres",
    link: "https://farseer-mu.vercel.app",
    source: github("farseer"),
    screenshots: [
      {
        src: "/screenshots/farseer/feed-desktop",
        size: "desktop",
        alt: "The feed of blue posts, under a search box and filters by game, kind and region",
        width: 1440,
        height: 900,
      },
      {
        src: "/screenshots/farseer/post-desktop",
        size: "desktop",
        alt: "A Blizzard news post opened, with its picture and buttons to share or save it",
        width: 1440,
        height: 900,
      },
      {
        src: "/screenshots/farseer/feed-phone",
        size: "phone",
        alt: "The feed on a phone: the game tabs, the filters and the newest blue posts",
        width: 780,
        height: 1688,
      },
    ],
  },
  {
    slug: "lucarne",
    name: "Lucarne",
    folder: "web",
    kind: "Web app",
    description:
      "The schedule of football fixtures and the French TV channel showing each one, from Ligue 1 to the World Cup, with live scores and push alerts, in a revival of broadcast teletext.",
    stack: "React 19, Vite, Tailwind 4, Hono, Bun, Postgres",
    link: "https://lucarne.fr",
    source: github("lucarne"),
    screenshots: [],
  },
  {
    slug: "wow-locker",
    name: "WoWLocker",
    folder: "web",
    kind: "Web app",
    description:
      "Your World of Warcraft Classic characters on your phone: gear and talents, what changed during a session, bags and mail, a Hardcore character's deaths and close calls. An installable web app with an addon, in an interface based on the game.",
    stack: "React 19, Vite, Tailwind 4, Hono, Postgres, Lua",
    link: "https://wow-locker.app",
    source: github("wow-locker"),
    screenshots: [],
  },
  {
    slug: "ravenpost",
    name: "Ravenpost",
    folder: "addons",
    kind: "Desktop app",
    description:
      "A small app for macOS and Windows, the addons' companion. A few seconds after you log out or reload, it carries what they saved: journals to Hearthtale's site, characters to WoWLocker's, and what you choose to share to the addons' database.",
    stack: "Go, Wails, React",
    link: "https://ravenpost-site.vercel.app",
    source: github("ravenpost"),
    screenshots: [],
  },
  {
    slug: "hearthtale",
    name: "Hearthtale",
    folder: "addons",
    kind: "WoW addon",
    description:
      "Keeps a journal for your World of Warcraft character as you play. Quests, close calls, new places and the people you travel with become entries in your character's voice, to read in game or on hearthtale.app.",
    stack: "Lua, React, Vite, Tailwind, Hono, Postgres",
    link: "https://hearthtale.app",
    source: github("hearthtale"),
    screenshots: [
      {
        src: "/screenshots/hearthtale/journal-desktop",
        size: "desktop",
        alt: "A journal page the addon wrote for Brannok, a test dwarf hunter",
        width: 1440,
        height: 900,
      },
      {
        src: "/screenshots/hearthtale/epitaph-desktop",
        size: "desktop",
        alt: "The epitaph the addon wrote for Pippa, a test gnome mage who died on Hardcore",
        width: 1440,
        height: 900,
      },
      {
        src: "/screenshots/hearthtale/journal-phone",
        size: "phone",
        alt: "Brannok's journal page on a phone, below the six sample pages to choose from",
        width: 780,
        height: 1688,
      },
    ],
  },
  {
    slug: "lorekeepers-codex",
    name: "Lorekeeper's Codex",
    folder: "addons",
    kind: "WoW addon",
    description:
      "A book of Azeroth's lore that fills in as you explore: a place, a person, a creature or a quest can reveal a page about the history behind it, each page an original text.",
    stack: "Lua",
    link: "-",
    source: github("lorekeepers-codex"),
    screenshots: [],
  },
  {
    slug: "mealbook",
    name: "Mealbook",
    folder: "addons",
    kind: "WoW addon",
    description:
      "A chef's cookbook that fills in as you learn to cook, and the road from your cooking skill to 300: the surest recipe at each step, where to learn it, and what to buy or gather.",
    stack: "Lua",
    link: "-",
    source: github("mealbook"),
    screenshots: [],
  },
  {
    slug: "second-wind",
    name: "Second Wind",
    folder: "addons",
    kind: "WoW addon",
    description:
      "A debrief after a close call or a death in World of Warcraft: the hits that hurt most, how your health fell, and which potions or abilities were ready but went unused.",
    stack: "Lua",
    link: "-",
    source: github("second-wind"),
    screenshots: [],
  },
  {
    slug: "keyring",
    name: "Keyring",
    folder: "addons",
    kind: "WoW addon",
    description: "Gathers your addons' minimap buttons into a drawer, leaving one key on the minimap.",
    stack: "Lua",
    link: "-",
    source: github("keyring"),
    screenshots: [],
  },
  {
    slug: "goodwill",
    name: "Goodwill",
    folder: "addons",
    kind: "WoW addon",
    description:
      "Every faction's road to Exalted from where you stand, and a chapter of its story at each standing you reach.",
    stack: "Lua",
    link: "-",
    source: github("goodwill"),
    screenshots: [],
  },
  {
    slug: "palaver",
    name: "Palaver",
    folder: "addons",
    kind: "WoW addon",
    description: "Quests and conversations with NPCs in a panel beside them, read and answered from the keyboard.",
    stack: "Lua",
    link: "-",
    source: github("palaver"),
    screenshots: [],
  },
  {
    slug: "primer",
    name: "Primer",
    folder: "addons",
    kind: "WoW addon",
    description:
      "A class guide to read out of combat: the opening and the order to press your spells in for your level and build, and the next talent points to take, each with its reason.",
    stack: "Lua",
    link: "-",
    source: github("primer"),
    screenshots: [],
  },
  {
    slug: "yonder",
    name: "Yonder",
    folder: "addons",
    kind: "WoW addon",
    description:
      "Riddles to solve, rare creatures to hunt and a record of what you find along the way, with notes from an Explorers' League naturalist.",
    stack: "Lua",
    link: "-",
    source: github("yonder"),
    screenshots: [],
  },
  {
    slug: "yours-truly",
    name: "Yours Truly",
    folder: "addons",
    kind: "WoW addon",
    description:
      "Letters from the people you helped: finish a quest chain that changed someone's life, and they write to you. The letter waits at the next mailbox you open.",
    stack: "Lua",
    link: "-",
    source: github("yours-truly"),
    screenshots: [],
  },
  {
    slug: "gero",
    name: "Gero",
    folder: "engines",
    kind: "Virtual machine",
    description:
      "A 16-bit virtual machine, assembler, disassembler and Lua-style language compiler, all in pure Zig. Gero Lab, its playground in the browser, runs it as WebAssembly.",
    stack: "Zig, WebAssembly",
    link: "https://gero-lab.vercel.app",
    source: github("gero"),
    screenshots: [
      {
        src: "/screenshots/gero/editor-desktop",
        size: "desktop",
        alt: "Gero Lab's editor on the fizzbuzz sample, in Gero, stopped at line 13",
        width: 1440,
        height: 900,
      },
      {
        src: "/screenshots/gero/cockpit-desktop",
        size: "desktop",
        alt: "Gero Lab stepping through fizzbuzz: stack, disassembly, registers and log",
        width: 1440,
        height: 900,
      },
    ],
  },
  {
    slug: "addon-kit",
    name: "addon-kit",
    folder: "tools",
    kind: "Lua kit",
    description:
      "The Lua code shared by most of the addons here, a copy in each: the books' windows and look, events, settings, achievements, the minimap button and the translations. Its scripts package, test and release them.",
    stack: "Lua, TypeScript, Bun",
    link: "-",
    source: github("addon-kit"),
    screenshots: [],
  },
  {
    slug: "wow-data",
    name: "wow-data",
    folder: "tools",
    kind: "Game data",
    description:
      "The World of Warcraft game data the addons are built from: the game client's tables, QuestieDB and the Classic database, pinned in one place, downloaded once and built into one SQLite database per game, with an explorer in the browser.",
    stack: "TypeScript, Bun, SQLite, React",
    link: "-",
    source: github("wow-data"),
    screenshots: [],
  },
  {
    slug: "harness",
    name: "harness",
    folder: "tools",
    kind: "Dev tool",
    description:
      "A small harness for working with Claude Code sessions on a project: a task board, a quiet runner for checks, a review packet and verdict before each commit, and git hooks that refuse to push an unchecked or unreviewed tree.",
    stack: "TypeScript, Bun",
    link: "-",
    source: github("harness"),
    screenshots: [],
  },
];

/** The project with this slug, if there is one. */
export function projectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}
