import { absolutePath, findProject, fileText, homePath, nodeAt, readmePath, resolve, sortedChildren, HOME } from "./fs";
import { FOLDERS, PROJECTS } from "./projects";

test("home holds README, contact.txt and projects", () => {
  expect(sortedChildren(HOME).map((n) => n.name)).toEqual(["projects", "contact.txt", "README"]);
});

test("projects holds the four folders, sorted", () => {
  const projects = nodeAt(["projects"]);
  expect(projects?.kind === "dir" && sortedChildren(projects).map((n) => n.name)).toEqual(["addons", "engines", "tools", "web"]);
  expect([...FOLDERS].sort()).toEqual(["addons", "engines", "tools", "web"]);
});

test("every project is a directory holding its README, and nothing else", () => {
  for (const project of PROJECTS) {
    const node = nodeAt(["projects", project.folder, project.slug]);
    expect(node?.kind).toBe("dir");
    if (node?.kind !== "dir") continue;
    expect(node.project).toBe(project);
    expect(node.children).toEqual([{ kind: "readme", name: "README", project }]);
    expect(nodeAt(["projects", project.folder, `${project.slug}.txt`])).toBeNull();
    expect(readmePath(project)).toBe(`~/projects/${project.folder}/${project.slug}/README`);
  }
});

test("a directory sorts before a file, then by name", () => {
  expect(sortedChildren(HOME).map((n) => n.kind)).toEqual(["dir", "file", "file"]);
});

test("resolve takes ~, a leading /, . and ..", () => {
  expect(resolve(["projects"], "web")).toEqual(["projects", "web"]);
  expect(resolve(["projects", "web"], "..")).toEqual(["projects"]);
  expect(resolve(["projects", "web"], "~")).toEqual([]);
  expect(resolve(["projects"], "~/projects/./web/")).toEqual(["projects", "web"]);
  expect(resolve(["projects"], "/projects")).toEqual(["projects"]);
  expect(resolve([], "../..")).toEqual([]);
  expect(resolve(["projects"], ".")).toEqual(["projects"]);
});

test("nodeAt finds files and refuses a path through one", () => {
  expect(nodeAt([])).toBe(HOME);
  expect(nodeAt(["README"])?.kind).toBe("file");
  expect(nodeAt(["README", "x"])).toBeNull();
  expect(nodeAt(["nope"])).toBeNull();
  expect(nodeAt(["constructor"])).toBeNull();
});

test("paths print as ~ and /home/guest", () => {
  expect(homePath([])).toBe("~");
  expect(homePath(["projects", "web"])).toBe("~/projects/web");
  expect(absolutePath([])).toBe("/home/guest");
  expect(absolutePath(["projects"])).toBe("/home/guest/projects");
});

test("fileText is the file as plain text", () => {
  const node = nodeAt(["contact.txt"]);
  expect(node?.kind === "file" && fileText(node)).toContain("max@jellycat.fr");
});

test("findProject takes a slug or a name's start, in the data's order", () => {
  expect(findProject("hun")?.slug).toBe("hundo");
  expect(findProject("lorekeeper's")?.slug).toBe("lorekeepers-codex");
  expect(findProject("second w")?.slug).toBe("second-wind");
  expect(findProject("zzz")).toBeUndefined();
});
