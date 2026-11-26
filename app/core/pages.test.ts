import { HOME_PAGE, PAGES, pageByPath } from "./pages";
import { PROJECTS } from "./projects";
import { STUDIO_NAME } from "./studio";

test("the home page comes first, at /", () => {
  expect(PAGES[0]).toBe(HOME_PAGE);
  expect(HOME_PAGE.path).toBe("/");
  expect(HOME_PAGE.title).toBe(STUDIO_NAME);
});

test("every project has its page, at its address, named and described as in the data", () => {
  for (const project of PROJECTS) {
    const page = pageByPath(`/projects/${project.slug}`);
    expect(page, project.slug).toEqual({
      kind: "project",
      slug: project.slug,
      path: `/projects/${project.slug}`,
      title: `${project.name} · ${STUDIO_NAME}`,
      description: project.description,
    });
  }
  expect(PAGES.filter((page) => page.kind === "project").map((page) => page.kind === "project" && page.slug)).toEqual(
    PROJECTS.map((project) => project.slug),
  );
});

test("paths are unique and start at the root", () => {
  const paths = PAGES.map((page) => page.path);
  expect(new Set(paths).size).toBe(paths.length);
  for (const path of paths) expect(path).toMatch(/^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/);
});

test("every page has a title and a description, neither empty nor padded", () => {
  for (const page of PAGES) {
    for (const text of [page.title, page.description]) {
      expect(text, page.path).not.toBe("");
      expect(text.trim(), page.path).toBe(text);
    }
  }
});

test("an address with no page has none", () => {
  expect(pageByPath("/projects/no-such")).toBeUndefined();
  expect(pageByPath("/projects")).toBeUndefined();
});
