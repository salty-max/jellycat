import { complete, historyStep } from "./complete";

test("a lone word completes a command", () => {
  expect(complete("he", [])).toEqual({ line: "help ", options: [] });
  expect(complete("th", [])).toEqual({ line: "theme ", options: [] });
});

test("several commands fill in what they share, then list", () => {
  expect(complete("c", [])).toEqual({ line: "c", options: ["cd", "cat", "crt", "clear"] });
  expect(complete("hi", [])).toEqual({ line: "history ", options: [] });
  expect(complete("cl", [])).toEqual({ line: "clear ", options: [] });
  expect(complete("l", [])).toEqual({ line: "l", options: ["ls", "less", "logout"] });
  expect(complete("lo", [])).toEqual({ line: "logout ", options: [] });
});

test("nothing matches, nothing changes", () => {
  expect(complete("zzz", [])).toEqual({ line: "zzz", options: [] });
  expect(complete("cd nope", [])).toEqual({ line: "cd nope", options: [] });
  expect(complete("cd nope/x", [])).toEqual({ line: "cd nope/x", options: [] });
});

test("a path completes through directories, a directory ends in a slash", () => {
  expect(complete("cd pro", [])).toEqual({ line: "cd projects/", options: [] });
  expect(complete("cd projects/w", [])).toEqual({ line: "cd projects/web/", options: [] });
  expect(complete("cd projects/web/hu", [])).toEqual({ line: "cd projects/web/hundo/", options: [] });
  expect(complete("cat projects/web/hundo/R", [])).toEqual({ line: "cat projects/web/hundo/README ", options: [] });
  expect(complete("cat R", [])).toEqual({ line: "cat README ", options: [] });
});

test("a path is read from the current directory", () => {
  expect(complete("cd w", ["projects"])).toEqual({ line: "cd web/", options: [] });
});

test("several names with nothing more in common are listed by name", () => {
  expect(complete("ls projects/", [])).toEqual({ line: "ls projects/", options: ["addons/", "engines/", "tools/", "web/"] });
  expect(complete("ls ", [])).toEqual({ line: "ls ", options: ["projects/", "contact.txt", "README"] });
});

test("a shared start is filled in", () => {
  expect(complete("ls projects/web/f", [])).toEqual({ line: "ls projects/web/farseer/", options: [] });
  expect(complete("open ", [])).toEqual({ line: "open ", options: ["projects/", "contact.txt", "README"] });
});

test("a path completes from ~ and from ..", () => {
  expect(complete("cd ~/pro", [])).toEqual({ line: "cd ~/projects/", options: [] });
  expect(complete("cd ../w", ["projects", "web"])).toEqual({ line: "cd ../web/", options: [] });
});

test("a word after && is a path", () => {
  expect(complete("cd projects && ls w", [])).toEqual({ line: "cd projects && ls w", options: [] });
});

test("history steps up and down, and stops at the ends", () => {
  const h = ["ls", "cd projects"];
  expect(historyStep(h, 2, "up")).toEqual({ index: 1, line: "cd projects" });
  expect(historyStep(h, 1, "up")).toEqual({ index: 0, line: "ls" });
  expect(historyStep(h, 0, "up")).toBeNull();
  expect(historyStep(h, 0, "down")).toEqual({ index: 1, line: "cd projects" });
  expect(historyStep(h, 1, "down")).toEqual({ index: 2, line: "" });
  expect(historyStep(h, 2, "down")).toBeNull();
  expect(historyStep([], 0, "up")).toBeNull();
});
