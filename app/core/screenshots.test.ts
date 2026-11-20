import { existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PROJECTS } from "./projects";

// The pictures scripts/screenshots.mjs writes to public/screenshots/<slug>/, held to the list projects.ts keeps. (A string, not
// `new URL(…)`: under jsdom that is jsdom's URL, which node:url refuses.)
const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), "../../public");
const SHOTS = PROJECTS.flatMap((project) => project.screenshots.map((shot) => ({ slug: project.slug, ...shot })));

test("every screenshot has its AVIF and its WebP, at the width and height projects.ts gives", async () => {
  for (const shot of SHOTS) {
    for (const extension of ["avif", "webp"]) {
      const file = `${PUBLIC}${shot.src}.${extension}`;
      expect(existsSync(file), file).toBe(true);
      const { width, height } = await sharp(file).metadata();
      expect({ width, height }, file).toEqual({ width: shot.width, height: shot.height });
    }
  }
});

test("no picture is listed twice", () => {
  const srcs = SHOTS.map((shot) => shot.src);
  expect(new Set(srcs).size).toBe(srcs.length);
});

// (projects.test.ts checks that each src is under its own project's folder.) Dotfiles are skipped: Finder writes .DS_Store, and git
// ignores it.
test("every picture in public/screenshots/ is listed in projects.ts", () => {
  const folder = `${PUBLIC}/screenshots`;
  if (!existsSync(folder)) return;
  const listed = new Set(SHOTS.map((shot) => shot.src));
  for (const entry of readdirSync(folder, { withFileTypes: true }).filter((entry) => !entry.name.startsWith("."))) {
    expect(entry.isDirectory(), `public/screenshots/${entry.name} is not a project's folder`).toBe(true);
    for (const file of readdirSync(`${folder}/${entry.name}`).filter((name) => !name.startsWith("."))) {
      expect(file, `${entry.name}/${file}`).toMatch(/^[a-z0-9-]+\.(avif|webp)$/);
      expect(listed, `${entry.name}/${file}`).toContain(`/screenshots/${entry.name}/${file.replace(/\.(avif|webp)$/, "")}`);
    }
  }
});

test("a desktop picture is wider than it is tall, a phone picture taller than it is wide", () => {
  for (const shot of SHOTS) expect(shot.size === "desktop" ? shot.width > shot.height : shot.height > shot.width, shot.src).toBe(true);
});
