// The shell's file system, built from the data: `~/README`, `~/contact.txt` and `~/projects/<folder>/<slug>/README`, a
// directory per project holding its README (there is no `<slug>.txt`: the card comes from `open`). A path is a list of
// names from the home directory, `[]` being `~`. Resolution and sorting are ported from the shell mockup.

import { FOLDERS, PROJECTS, type Project } from "./projects";
import { CONTACT, plainText, README, type TextFile } from "./studio";

export type FsDir = {
  kind: "dir";
  name: string;
  children: readonly FsNode[];
  /** Set on a project's own directory, which `open` shows as a card. */
  project?: Project;
};

/** A text file of the studio's: `README` and `contact.txt` in the home directory. */
export type FsText = { kind: "file"; name: string; content: TextFile };

/** A project's README: its text is `app/core/readme.ts`'s, loaded by slug, so the tree holds only the project. */
export type FsReadme = { kind: "readme"; name: "README"; project: Project };

export type FsNode = FsDir | FsText | FsReadme;

const dir = (name: string, children: readonly FsNode[], project?: Project): FsDir => ({ kind: "dir", name, children, project });

/** Dirs first, then by name, as `ls` lists them. */
export function sortedChildren(parent: FsDir): FsNode[] {
  return [...parent.children].sort((a, b) => Number(b.kind === "dir") - Number(a.kind === "dir") || a.name.localeCompare(b.name));
}

/** `~`: the home directory the session starts in. */
export const HOME: FsDir = dir("~", [
  { kind: "file", name: "README", content: README },
  { kind: "file", name: "contact.txt", content: CONTACT },
  dir(
    "projects",
    FOLDERS.map((folder) =>
      dir(
        folder,
        PROJECTS.filter((project) => project.folder === folder).map((project) =>
          dir(project.slug, [{ kind: "readme", name: "README", project }], project),
        ),
      ),
    ),
  ),
]);

/** The path as the names from `~`, `.` and `..` resolved; `~` and a leading `/` start at home (the OS has no other root). */
export function resolve(cwd: readonly string[], input: string): string[] {
  const parts = /^[~/]/.test(input) ? [] : [...cwd];
  for (const name of input.replace(/^~\/?|^\//, "").split("/")) {
    if (!name || name === ".") continue;
    if (name === "..") parts.pop();
    else parts.push(name);
  }
  return parts;
}

/** The node at the path, or `null`. */
export function nodeAt(path: readonly string[]): FsNode | null {
  let node: FsNode = HOME;
  for (const name of path) {
    if (node.kind !== "dir") return null;
    const next: FsNode | undefined = node.children.find((child) => child.name === name);
    if (!next) return null;
    node = next;
  }
  return node;
}

/** `~`, `~/projects/web`: the path as the prompt and the status bar show it. */
export const homePath = (path: readonly string[]) => "~" + (path.length ? "/" + path.join("/") : "");

/** `/home/guest/projects`: the path as `pwd` prints it. */
export const absolutePath = (path: readonly string[]) => "/home/guest" + (path.length ? "/" + path.join("/") : "");

/** A project's README, as the card and `ls` show it: `~/projects/<folder>/<slug>/README`. */
export const readmePath = (project: Project) => `~/projects/${project.folder}/${project.slug}/README`;

/** A text file as plain text, each link as its words. */
export const fileText = (file: FsText) => plainText(file.content);

/** The project whose slug or name starts with the words, as `open` and `view` take them: the first in the project data. */
export function findProject(query: string): Project | undefined {
  const q = query.toLowerCase();
  return PROJECTS.find((project) => project.slug.startsWith(q) || project.name.toLowerCase().startsWith(q));
}
