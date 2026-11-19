import { FOLDER_NAMES, FOLDERS, PROJECTS, projectBySlug, type Project } from "./projects";

// "-" or an https address: an unknown link is written "-", never left empty or on http.
const isLinkOrDash = (value: string) => value === "-" || /^https:\/\/[^\s]+$/.test(value);

test("slugs are unique and safe in a URL and a file name", () => {
  const slugs = PROJECTS.map((p) => p.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
  for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("names are unique", () => {
  const names = PROJECTS.map((p) => p.name.toLowerCase());
  expect(new Set(names).size).toBe(names.length);
});

test("no field is empty or padded", () => {
  const fields: (keyof Project)[] = ["slug", "name", "folder", "kind", "description", "stack", "link", "source"];
  for (const project of PROJECTS) {
    for (const field of fields) {
      const value = project[field];
      expect(typeof value, `${project.slug}.${field}`).toBe("string");
      expect((value as string).trim(), `${project.slug}.${field}`).toBe(value);
      expect(value, `${project.slug}.${field}`).not.toBe("");
    }
  }
});

test("only a stack, a link or a source can be unknown", () => {
  for (const project of PROJECTS) {
    for (const field of ["slug", "name", "kind", "description"] as const) {
      expect(project[field], `${project.slug}.${field}`).not.toBe("-");
    }
  }
});

test("links and sources are https addresses or -", () => {
  for (const project of PROJECTS) {
    expect(isLinkOrDash(project.link), `${project.slug}.link: ${project.link}`).toBe(true);
    expect(isLinkOrDash(project.source), `${project.slug}.source: ${project.source}`).toBe(true);
  }
});

test("every project is in a known folder, and every folder holds one", () => {
  for (const project of PROJECTS) expect(FOLDERS, project.slug).toContain(project.folder);
  for (const folder of FOLDERS) expect(PROJECTS.some((p) => p.folder === folder), folder).toBe(true);
  expect(Object.keys(FOLDER_NAMES).sort()).toEqual([...FOLDERS].sort());
});

test("screenshots have an extensionless path under the project's folder, a size, alt text and dimensions", () => {
  for (const project of PROJECTS) {
    for (const shot of project.screenshots) {
      expect(shot.src, project.slug).toMatch(new RegExp(`^/screenshots/${project.slug}/[a-z0-9-]+$`));
      expect(["desktop", "phone"], shot.src).toContain(shot.size);
      expect(shot.alt.trim(), shot.src).not.toBe("");
      expect(Number.isInteger(shot.width) && shot.width > 0, shot.src).toBe(true);
      expect(Number.isInteger(shot.height) && shot.height > 0, shot.src).toBe(true);
    }
  }
});

test("a project is found by its slug", () => {
  expect(projectBySlug("hundo")?.name).toBe("Hundo");
  expect(projectBySlug("no-such")).toBeUndefined();
});
