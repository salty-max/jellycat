import { COMMAND_NAMES, banner, lastLogin, newSession, prompt, run, welcome, type Line, type Session } from "./shell";
import { OS_NAME, OS_VERSION } from "./site";
import { PROJECTS } from "./projects";

const NOW = new Date(2026, 10, 20, 2, 55, 0);
const go = (line: string, session: Session = newSession()) => run(line, session, { now: NOW });
const words = (lines: readonly Line[]) => lines.map((l) => l.map((s) => ("text" in s ? s.text : s.kind)).join(""));
const at = (...cwd: string[]): Session => ({ cwd, history: [] });

test("the commands, in the order Tab lists them", () => {
  expect(COMMAND_NAMES).toEqual(["help", "ls", "cd", "pwd", "cat", "less", "more", "open", "view", "gero", "tree", "browse", "theme", "crt", "clear", "history", "whoami", "date", "uname", "echo", "logout", "exit"]);
});

test("the prompt, the banner and the welcome", () => {
  expect(prompt([])).toBe("guest@jellycat:~$ ");
  expect(prompt(["projects", "web"])).toBe("guest@jellycat:~/projects/web$ ");
  expect(banner()).toBe(`${OS_NAME} ${OS_VERSION} tty1`);
  expect(words(welcome())).toEqual(["Jellycat Studio. Type help for the commands, or click a name.", "Try: ls  tree  open hundo  browse", ""]);
});

test("a blank line prints nothing and is not kept", () => {
  const r = go("   ");
  expect(r.lines).toEqual([]);
  expect(r.effects).toEqual([]);
  expect(r.session.history).toEqual([]);
});

test("an unknown command, and the rest of the line still runs", () => {
  expect(words(go("nope").lines)).toEqual(["jsh: nope: command not found"]);
  expect(words(go("nope && whoami").lines)).toEqual(["jsh: nope: command not found", "guest"]);
  expect(words(go("constructor").lines)).toEqual(["jsh: constructor: command not found"]);
  expect(words(go("geroo").lines)).toEqual(["jsh: geroo: command not found"]);
});

test("help lists the commands, view included", () => {
  const out = words(go("help").lines);
  expect(out).toContain("less <file>       open a file");
  expect(out).toContain("view <project>    screenshot viewer");
  expect(out).toContain("gero run <name>   run a Lab program");
  expect(out.at(-1)).toBe("clear  history  pwd  whoami  date  uname  echo  logout");
});

test("ls lists directories first, project names as links", () => {
  expect(words(go("ls").lines)).toEqual(["projects/  contact.txt  README"]);
  const home = go("ls").lines[0];
  expect(home.map((s) => ("text" in s ? s.text : ""))).toEqual(["projects/", "  ", "contact.txt", "  ", "README"]);
  expect(home[0]).toEqual({ kind: "command", text: "projects/", command: "cd projects && ls" });
  expect(home[4]).toEqual({ kind: "command", text: "README", command: "cat README" });
  const web = go("ls projects/web").lines[0];
  expect(web[0]).toEqual({ kind: "project", text: "farseer/", slug: "farseer" });
  const hundo = go("ls projects/web/hundo").lines[0];
  expect(hundo).toEqual([{ kind: "command", text: "README", command: "less projects/web/hundo/README" }]);
});

test("ls joins names to the directory as typed", () => {
  expect(go("ls projects/").lines[0][0]).toEqual({ kind: "command", text: "addons/", command: "cd projects/addons && ls" });
  expect(go("ls ~").lines[0][0]).toEqual({ kind: "command", text: "projects/", command: "cd ~/projects && ls" });
  expect(go("ls -l projects").lines[0][0]).toEqual({ kind: "command", text: "addons/", command: "cd projects/addons && ls" });
});

test("ls of a file prints its name as a button, of nothing an error", () => {
  expect(go("ls README").lines).toEqual([[{ kind: "command", text: "README", command: "cat README" }]]);
  expect(go("ls projects/web/hundo/README").lines[0][0]).toEqual({ kind: "command", text: "projects/web/hundo/README", command: "less projects/web/hundo/README" });
  expect(words(go("ls nope").lines)).toEqual(["ls: cannot access 'nope': No such file or directory"]);
});

test("ls of / is home", () => {
  expect(go("ls /").lines[0][0]).toEqual({ kind: "command", text: "projects/", command: "cd /projects && ls" });
});

test("cd moves the session, ~ and no argument go home, errors leave it", () => {
  expect(go("cd projects/web").session.cwd).toEqual(["projects", "web"]);
  expect(go("cd ..", at("projects", "web")).session.cwd).toEqual(["projects"]);
  expect(go("cd", at("projects")).session.cwd).toEqual([]);
  expect(go("cd ~", at("projects")).session.cwd).toEqual([]);
  expect(words(go("cd nope", at("projects")).lines)).toEqual(["cd: nope: No such file or directory"]);
  expect(go("cd nope", at("projects")).session.cwd).toEqual(["projects"]);
  expect(words(go("cd README").lines)).toEqual(["cd: README: Not a directory"]);
});

test("pwd prints the absolute path", () => {
  expect(words(go("pwd").lines)).toEqual(["/home/guest"]);
  expect(words(go("pwd", at("projects")).lines)).toEqual(["/home/guest/projects"]);
});

test("cat prints a file, a README by its slug, and says what is wrong", () => {
  expect(words(go("cat").lines)).toEqual(["cat: missing file operand"]);
  expect(words(go("cat README").lines)).toEqual(["Jellycat Studio", "", "Web apps, World of Warcraft addons, engines and tools.", "", "Each project has a README in the projects folder.", "Contact: max@jellycat.fr"]);
  expect(go("cat contact.txt").lines[0]).toEqual([{ kind: "text", text: "Email   " }, { kind: "link", text: "max@jellycat.fr", href: "mailto:max@jellycat.fr" }]);
  expect(go("cat projects/web/hundo/README").lines).toEqual([[{ kind: "readme", slug: "hundo" }]]);
  expect(go("cat nope projects README").lines.length).toBe(1 + 1 + 6);
  expect(words(go("cat nope").lines)).toEqual(["cat: nope: No such file or directory"]);
  expect(words(go("cat projects").lines)).toEqual(["cat: projects: Is a directory"]);
});

test("less and more page a file and end the line", () => {
  const r = go("less README && whoami");
  expect(r.lines).toEqual([]);
  expect(r.effects).toEqual([{ kind: "page", command: "less", path: "~/README", source: { kind: "lines", lines: expect.any(Array) } }]);
  expect(go("more projects/web/hundo/README").effects).toEqual([{ kind: "page", command: "more", path: "~/projects/web/hundo/README", source: { kind: "readme", slug: "hundo" } }]);
});

test("less and more refuse as the mockup words it", () => {
  expect(words(go("less").lines)).toEqual(["less: missing file operand"]);
  expect(words(go("more").lines)).toEqual(["more: missing file operand"]);
  expect(words(go("less nope").lines)).toEqual(["less: nope: No such file or directory"]);
  expect(words(go("more nope").lines)).toEqual(["more: nope: No such file or directory"]);
  expect(words(go("less projects").lines)).toEqual(["less: projects: Is a directory"]);
  expect(words(go("more projects").lines)).toEqual(["more: projects: Is a directory"]);
  expect(go("less nope").effects).toEqual([]);
});

test("the path a page shows is resolved from where the session is", () => {
  expect(go("less hundo/README", at("projects", "web")).effects[0]).toMatchObject({ path: "~/projects/web/hundo/README" });
});

test("open prints the card and opens the project", () => {
  const r = go("open hun");
  expect(r.lines).toEqual([[{ kind: "card", slug: "hundo" }]]);
  expect(r.effects).toEqual([{ kind: "openProject", slug: "hundo" }]);
  expect(go("open Second Wind").effects).toEqual([{ kind: "openProject", slug: "second-wind" }]);
  expect(go("open lorekeeper's").effects).toEqual([{ kind: "openProject", slug: "lorekeepers-codex" }]);
});

test("open asks for a name or says none matches", () => {
  expect(go("open").lines).toEqual([[{ kind: "text", text: "open: name a project, for example: " }, { kind: "command", text: "open hundo", command: "open hundo" }]]);
  expect(words(go("open ZZ").lines)).toEqual(["open: no project matches 'zz'"]);
  expect(go("open zz").effects).toEqual([]);
});

test("view opens the viewer for a project with screenshots and ends the line", () => {
  const withShots = PROJECTS.find((p) => p.screenshots.length)!;
  const r = go(`view ${withShots.slug} && whoami`);
  expect(r.effects).toEqual([{ kind: "viewProject", slug: withShots.slug }]);
  expect(r.lines).toEqual([]);
});

test("view says a project has no screenshots, asks for a name, says none matches", () => {
  const without = PROJECTS.find((p) => !p.screenshots.length)!;
  expect(words(go(`view ${without.slug}`).lines)).toEqual([`view: ${without.slug}: no screenshots`]);
  expect(go(`view ${without.slug}`).effects).toEqual([]);
  expect(go("view").lines).toEqual([[{ kind: "text", text: "view: name a project, for example: " }, { kind: "command", text: "view hundo", command: "view hundo" }]]);
  expect(words(go("view zz").lines)).toEqual(["view: no project matches 'zz'"]);
});

test("gero opens the Lab, runs a program or lists them, as effects that end the line", () => {
  expect(go("gero").effects).toEqual([{ kind: "gero", action: "open" }]);
  expect(go("gero run fizzbuzz && whoami")).toMatchObject({ effects: [{ kind: "gero", action: "run", program: "fizzbuzz" }], lines: [] });
  expect(go("gero help").effects).toEqual([{ kind: "gero", action: "help" }]);
  expect(go("gero").lines).toEqual([]);
});

test("gero says what it takes when it is asked wrongly", () => {
  expect(words(go("gero run").lines)).toEqual(["gero: name a program, see gero help"]);
  expect(go("gero run").lines[0]).toContainEqual({ kind: "command", text: "gero help", command: "gero help" });
  expect(words(go("gero x").lines)).toEqual(["gero: use gero, gero run <program> or gero help"]);
  expect(words(go("gero run a b").lines)).toEqual(["gero: use gero, gero run <program> or gero help"]);
  expect(go("gero x && whoami").effects).toEqual([]);
  expect(words(go("gero x && whoami").lines)).toEqual(["gero: use gero, gero run <program> or gero help", "guest"]);
});

test("tree draws ~/projects with folders and project links", () => {
  const lines = go("tree").lines;
  const out = words(lines);
  expect(out.slice(0, 4)).toEqual(["~/projects", "|-- addons", "|   |-- goodwill", "|   |-- hearthtale"]);
  const web = out.indexOf("`-- web");
  expect(out.slice(web, web + 3)).toEqual(["`-- web", "    |-- farseer", "    |-- hundo"]);
  expect(out.at(-1)).toBe("    `-- wow-locker");
  expect(lines.length).toBe(1 + 4 + PROJECTS.length);
  expect(lines[1][1]).toEqual({ kind: "command", text: "addons", command: "cd ~/projects/addons && ls" });
  expect(lines[2][1]).toEqual({ kind: "project", text: "goodwill", slug: "goodwill" });
});

test("browse is an effect and ends the line", () => {
  const r = go("browse && whoami");
  expect(r.effects).toEqual([{ kind: "browse" }]);
  expect(r.lines).toEqual([]);
});

test("theme and crt set, or say how to", () => {
  expect(go("theme amber").effects).toEqual([{ kind: "theme", phosphor: "amber" }]);
  expect(go("theme green").effects).toEqual([{ kind: "theme", phosphor: "green" }]);
  expect(go("theme white").effects).toEqual([{ kind: "theme", phosphor: "white" }]);
  expect(words(go("theme pink").lines)).toEqual(["theme: use green, amber or white"]);
  expect(words(go("theme").lines)).toEqual(["theme: use green, amber or white"]);
  expect(go("crt off").effects).toEqual([{ kind: "crt", on: false }]);
  expect(go("crt on").effects).toEqual([{ kind: "crt", on: true }]);
  expect(words(go("crt maybe").lines)).toEqual(["crt: use on or off"]);
  expect(words(go("crt").lines)).toEqual(["crt: use on or off"]);
});

test("clear empties the log, even what came before it on the line", () => {
  expect(go("clear").effects).toEqual([{ kind: "clear" }]);
  const r = go("whoami && clear && pwd");
  expect(r.effects).toEqual([{ kind: "clear" }]);
  expect(words(r.lines)).toEqual(["/home/guest"]);
});

test("history numbers the lines, the current one included", () => {
  let session = newSession();
  session = go("ls", session).session;
  session = go("cd projects", session).session;
  const r = go("history", session);
  expect(words(r.lines)).toEqual(["   1  ls", "   2  cd projects", "   3  history"]);
  expect(r.session.history).toEqual(["ls", "cd projects", "history"]);
  expect(go("  ls  ").session.history).toEqual(["ls"]);
});

test("lastLogin prints the clock as the mockup does", () => {
  expect(words(lastLogin(NOW))).toEqual(["Last login: Fri Nov 20 2026 02:55 on tty1", ""]);
});

test("whoami, date, uname, echo", () => {
  expect(words(go("whoami").lines)).toEqual(["guest"]);
  expect(words(go("date").lines)).toEqual(["Fri Nov 20 2026 02:55:00"]);
  expect(words(go("uname").lines)).toEqual([OS_NAME]);
  expect(words(go("uname -a").lines)).toEqual([`${OS_NAME} ${OS_VERSION} jellycat tty1`]);
  expect(words(go("echo a   b  c").lines)).toEqual(["a b c"]);
  expect(go("echo").lines).toEqual([[]]);
});

test("logout and exit both log out and end the line", () => {
  for (const name of ["logout", "exit"]) {
    const r = go(`${name} && whoami`);
    expect(r.effects).toEqual([{ kind: "logout" }]);
    expect(r.lines).toEqual([]);
  }
});

test("&& runs each command in turn, with the cwd it left", () => {
  const r = go("cd projects && pwd && cd web && pwd");
  expect(words(r.lines)).toEqual(["/home/guest/projects", "/home/guest/projects/web"]);
  expect(r.session.cwd).toEqual(["projects", "web"]);
  expect(words(go("echo a&&echo b").lines)).toEqual(["a", "b"]);
  expect(words(go("&& echo a &&").lines)).toEqual(["a"]);
});

test("run does not change the session it is given", () => {
  const session = Object.freeze({ cwd: Object.freeze(["projects"]), history: Object.freeze(["ls"]) }) as Session;
  go("cd web && whoami", session);
  expect(session.cwd).toEqual(["projects"]);
  expect(session.history).toEqual(["ls"]);
});
