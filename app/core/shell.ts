// The shell's command runner, ported from `mockups/phosphor-shell.html`. It is pure and synchronous: it takes a line and the
// session and returns typed output, the new session and the effects the host performs (settings, windows, full-screen
// views). It prints no README itself: the renderer fills a `readme` segment from `loadReadme(slug)`.

import {
  absolutePath,
  findProject,
  homePath,
  nodeAt,
  resolve,
  sortedChildren,
  type FsDir,
  type FsNode,
} from "./fs";
import { OS_NAME, OS_VERSION } from "./site";
import { STUDIO_NAME, type TextFile } from "./studio";

/** A stretch of a line of output; the renderer makes `command` a button, `project` a link to the project's page. */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "dim"; text: string }
  /** A name that runs `command` when pressed. */
  | { kind: "command"; text: string; command: string }
  /** A project's name: a link to `/projects/<slug>` that runs `open <slug>`. */
  | { kind: "project"; text: string; slug: string }
  | { kind: "link"; text: string; href: string }
  /** The project's card (`docs/design.md`), alone on its line; its README row is `readmePath(project)`, which runs `less`. */
  | { kind: "card"; slug: string }
  /** The project's README, alone on its line, filled by the renderer. */
  | { kind: "readme"; slug: string };

/** One line of output; an empty line is `[]`. */
export type Line = readonly Segment[];

export const PHOSPHORS = ["green", "amber", "white"] as const;
export type Phosphor = (typeof PHOSPHORS)[number];

/** What `less` and `more` page: a README by its slug, or a text file's lines. */
export type PageSource = { kind: "readme"; slug: string } | { kind: "lines"; lines: readonly Line[] };

/**
 * What the host does, in order. `clear` empties the log before this line's output is printed (the echo of the line
 * included). `openProject` comes with the card already printed. `page`, `view`, `browse` and `logout` end the line: what
 * follows them after a `&&` is not run.
 */
export type Effect =
  | { kind: "openProject"; slug: string }
  | { kind: "viewProject"; slug: string }
  | { kind: "page"; command: "less" | "more"; path: string; source: PageSource }
  | { kind: "theme"; phosphor: Phosphor }
  | { kind: "crt"; on: boolean }
  | { kind: "browse" }
  | { kind: "clear" }
  | { kind: "logout" };

export interface Session {
  cwd: readonly string[];
  history: readonly string[];
}

export interface Result {
  lines: Line[];
  effects: Effect[];
  session: Session;
}

export const newSession = (): Session => ({ cwd: [], history: [] });

/** `guest@jellycat:~/projects$ `, what the host prints before a line it echoes. */
export const prompt = (cwd: readonly string[]) => `guest@jellycat:${homePath(cwd)}$ `;

/** The first line of a login: `Jelly-OS 1.0 tty1`. */
export const banner = () => `${OS_NAME} ${OS_VERSION} tty1`;

const text = (value: string): Segment => ({ kind: "text", text: value });
const command = (value: string, run: string): Segment => ({ kind: "command", text: value, command: run });
const plain = (value: string): Line => [text(value)];

/** `Last login: Fri Nov 20 02:55 on tty1` and the blank line after it, as a login prints them. */
export function lastLogin(now: Date = new Date()): Line[] {
  return [plain(`Last login: ${now.toString().slice(0, 16)}${now.toTimeString().slice(0, 5)} on tty1`), []];
}

/** The two lines after a login or a page load. */
export function welcome(): Line[] {
  return [
    plain(`${STUDIO_NAME}. Type help for the commands, or click a name.`),
    [text("Try: "), command("ls", "ls"), text("  "), command("tree", "tree"), text("  "), command("open hundo", "open hundo"), text("  "), command("browse", "browse")],
    [],
  ];
}

/** A text file's lines as output: a link is a `link` segment, the rest text. */
function fileLines(file: TextFile): Line[] {
  return file.map((line) => line.map((span): Segment => (typeof span === "string" ? text(span) : { kind: "link", text: span.text, href: span.href })));
}

const HELP = [
  "ls [dir]          list a directory",
  "cd [dir]          change directory",
  "cat <file>        print a file",
  "less <file>       page through a file (q to quit)",
  "open <project>    show a project",
  "view <project>    screenshot viewer (q to quit)",
  "tree              show ~/projects as a tree",
  "browse            two-pane file browser (q to quit)",
  "theme <color>     green, amber or white",
  "crt on|off        CRT effects",
  "clear  history  pwd  whoami  date  uname  echo  logout",
];

interface Env {
  now: Date;
}

interface Out {
  lines: Line[];
  effects: Effect[];
  cwd: readonly string[];
  history: readonly string[];
  /** The line ends here: a full-screen view or the logout took over. */
  stop?: boolean;
}

type Handler = (args: string[], out: Out, env: Env) => void;

const say = (out: Out, ...lines: Line[]) => out.lines.push(...lines);

/** `a`, `a/b`: how `ls` joins a name to the directory it was asked about. */
const joinTo = (target: string, name: string) => (target === "." ? name : target.replace(/\/$/, "") + "/" + name);

/** An entry as `ls` shows it. */
function entry(node: FsNode, target: string): Segment {
  if (node.kind === "dir") {
    return node.project
      ? { kind: "project", text: node.name + "/", slug: node.project.slug }
      : command(node.name + "/", `cd ${joinTo(target, node.name)} && ls`);
  }
  return command(node.name, `${node.kind === "readme" ? "less" : "cat"} ${joinTo(target, node.name)}`);
}

function view(args: string[], out: Out, name: "open" | "view") {
  const query = args.join(" ").toLowerCase();
  if (!query) {
    say(out, [text(`${name}: name a project, for example: `), command(`${name} hundo`, `${name} hundo`)]);
    return undefined;
  }
  const project = findProject(query);
  if (!project) say(out, plain(`${name}: no project matches '${query}'`));
  return project;
}

function page(name: "less" | "more"): Handler {
  return (args, out) => {
    const target = args[0];
    if (!target) return say(out, plain(`${name}: missing file operand`));
    const path = resolve(out.cwd, target);
    const node = nodeAt(path);
    if (!node) return say(out, plain(`${name}: ${target}: No such file or directory`));
    if (node.kind === "dir") return say(out, plain(`${name}: ${target}: Is a directory`));
    const source: PageSource = node.kind === "readme" ? { kind: "readme", slug: node.project.slug } : { kind: "lines", lines: fileLines(node.content) };
    out.effects.push({ kind: "page", command: name, path: homePath(path), source });
    out.stop = true;
  };
}

const COMMANDS: Record<string, Handler> = {
  help: (_args, out) => say(out, ...HELP.map(plain)),
  ls: (args, out) => {
    const target = args.find((arg) => !arg.startsWith("-")) ?? ".";
    const node = nodeAt(resolve(out.cwd, target));
    if (!node) return say(out, plain(`ls: cannot access '${target}': No such file or directory`));
    if (node.kind !== "dir") return say(out, [command(target, `${node.kind === "readme" ? "less" : "cat"} ${target}`)]);
    const names = sortedChildren(node).flatMap((child, index): Segment[] => (index ? [text("  "), entry(child, target)] : [entry(child, target)]));
    say(out, names);
  },
  cd: (args, out) => {
    const target = args[0] ?? "~";
    const path = resolve(out.cwd, target);
    const node = nodeAt(path);
    if (!node) return say(out, plain(`cd: ${target}: No such file or directory`));
    if (node.kind !== "dir") return say(out, plain(`cd: ${target}: Not a directory`));
    out.cwd = path;
  },
  pwd: (_args, out) => say(out, plain(absolutePath(out.cwd))),
  cat: (args, out) => {
    if (!args[0]) return say(out, plain("cat: missing file operand"));
    for (const target of args) {
      const node = nodeAt(resolve(out.cwd, target));
      if (!node) say(out, plain(`cat: ${target}: No such file or directory`));
      else if (node.kind === "dir") say(out, plain(`cat: ${target}: Is a directory`));
      else if (node.kind === "readme") say(out, [{ kind: "readme", slug: node.project.slug }]);
      else say(out, ...fileLines(node.content));
    }
  },
  less: page("less"),
  more: page("more"),
  open: (args, out) => {
    const project = view(args, out, "open");
    if (!project) return;
    say(out, [{ kind: "card", slug: project.slug }]);
    out.effects.push({ kind: "openProject", slug: project.slug });
  },
  view: (args, out) => {
    const project = view(args, out, "view");
    if (!project) return;
    if (!project.screenshots.length) return say(out, plain(`view: ${project.slug}: no screenshots`));
    out.effects.push({ kind: "viewProject", slug: project.slug });
    out.stop = true;
  },
  tree: (_args, out) => {
    const projects = nodeAt(["projects"]) as FsDir;
    say(out, plain("~/projects"));
    const folders = sortedChildren(projects) as FsDir[];
    folders.forEach((folder, index) => {
      const last = index === folders.length - 1;
      say(out, [text(last ? "`-- " : "|-- "), command(folder.name, `cd ~/projects/${folder.name} && ls`)]);
      const items = sortedChildren(folder) as FsDir[];
      items.forEach((item, at) => {
        const guide = (last ? "    " : "|   ") + (at === items.length - 1 ? "`-- " : "|-- ");
        say(out, [text(guide), { kind: "project", text: item.name, slug: item.project!.slug }]);
      });
    });
  },
  browse: (_args, out) => {
    out.effects.push({ kind: "browse" });
    out.stop = true;
  },
  theme: (args, out) => {
    const phosphor = PHOSPHORS.find((name) => name === args[0]);
    if (!phosphor) return say(out, plain("theme: use green, amber or white"));
    out.effects.push({ kind: "theme", phosphor });
  },
  crt: (args, out) => {
    if (args[0] !== "on" && args[0] !== "off") return say(out, plain("crt: use on or off"));
    out.effects.push({ kind: "crt", on: args[0] === "on" });
  },
  clear: (_args, out) => {
    out.lines = [];
    out.effects.push({ kind: "clear" });
  },
  history: (_args, out) => say(out, ...out.history.map((entry, index) => plain(String(index + 1).padStart(4) + "  " + entry))),
  whoami: (_args, out) => say(out, plain("guest")),
  date: (_args, out, env) => say(out, plain(env.now.toString().slice(0, 24))),
  uname: (args, out) => say(out, plain(args.includes("-a") ? `${OS_NAME} ${OS_VERSION} jellycat tty1` : OS_NAME)),
  echo: (args, out) => say(out, args.length ? plain(args.join(" ")) : []),
  logout: (_args, out) => {
    out.effects.push({ kind: "logout" });
    out.stop = true;
  },
  exit: (args, out, env) => COMMANDS.logout(args, out, env),
};

/** The commands, in the order Tab lists them. */
export const COMMAND_NAMES: readonly string[] = Object.keys(COMMANDS);

/**
 * Runs one line: `&&` separates commands, each split on whitespace, and the line is added to the history unless it is
 * blank. An unknown command is `jsh: <name>: command not found` and the rest still runs. `env.now` is the clock `date`
 * reads.
 */
export function run(line: string, session: Session, env: Env = { now: new Date() }): Result {
  const trimmed = line.trim();
  const out: Out = {
    lines: [],
    effects: [],
    cwd: session.cwd,
    history: trimmed ? [...session.history, trimmed] : session.history,
  };
  for (const part of trimmed.split("&&")) {
    const [name, ...args] = part.trim().split(/\s+/);
    if (!name) continue;
    if (!Object.hasOwn(COMMANDS, name)) {
      say(out, plain(`jsh: ${name}: command not found`));
      continue;
    }
    COMMANDS[name](args, out, env);
    if (out.stop) break;
  }
  return { lines: out.lines, effects: out.effects, session: { cwd: out.cwd, history: out.history } };
}
