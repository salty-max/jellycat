// @vitest-environment node
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { CONTACT_PAGE, HOME_PAGE, PAGES, type Page } from "../app/core/pages";
import { FOLDERS, PROJECTS } from "../app/core/projects";
import { PREVIEW_IMAGE } from "../app/core/site";
import { ADVANCE, cardFor, columns, drawImage, fitSize, wrap } from "./og";

const font = await readFile(fileURLToPath(new URL("../node_modules/@fontsource/vt323/files/vt323-latin-400-normal.woff", import.meta.url)));

// A table of a WOFF font, inflated: the header is 44 bytes, then 20 bytes a table (tag, offset, compressed and original lengths, checksum).
function table(woff: Buffer, tag: string): Buffer {
  for (let entry = 44; entry < 44 + 20 * woff.readUInt16BE(12); entry += 20) {
    if (woff.toString("latin1", entry, entry + 4) !== tag) continue;
    const data = woff.subarray(woff.readUInt32BE(entry + 4), woff.readUInt32BE(entry + 4) + woff.readUInt32BE(entry + 8));
    return woff.readUInt32BE(entry + 8) < woff.readUInt32BE(entry + 12) ? inflateSync(data) : data;
  }
  throw new Error(`no ${tag} table`);
}

describe("ADVANCE", () => {
  test("is what the font advances: every glyph is as wide as ADVANCE of an em, or has no width", () => {
    const unitsPerEm = table(font, "head").readUInt16BE(18);
    const hhea = table(font, "hhea");
    const hmtx = table(font, "hmtx");
    const widths = new Set<number>();
    for (let glyph = 0; glyph < hhea.readUInt16BE(34); glyph++) widths.add(hmtx.readUInt16BE(glyph * 4));
    expect([...widths].filter((width) => width !== 0)).toEqual([ADVANCE * unitsPerEm]);
  });
});

describe("columns", () => {
  test("VT323 advances 0.4 em, so 48px text holds 56 characters in the 1088px between the margins", () => {
    expect(columns(48, 1088)).toBe(56);
    expect(columns(40, 400)).toBe(25);
  });
});

describe("wrap", () => {
  test("breaks at spaces, keeping each line within the width", () => {
    expect(wrap("one two three four", 9, 5)).toEqual(["one two", "three", "four"]);
    expect(wrap("one two", 7, 5)).toEqual(["one two"]);
  });

  test("breaks after a hyphen that joins two words, as a browser does", () => {
    expect(wrap("for single-player games", 14, 5)).toEqual(["for single-", "player games"]);
    expect(wrap("a single-player", 15, 5)).toEqual(["a single-player"]);
  });

  test("cuts at the last line with three dots, which take the room of the characters they cover", () => {
    const lines = wrap("aaaa bbbb cccc dddd eeee ffff", 9, 2);
    expect(lines).toEqual(["aaaa bbbb", "cccc d..."]);
    expect(lines.every((line) => line.length <= 9)).toBe(true);
  });

  test("drops a space left before the dots, and cuts nothing when the text fits", () => {
    expect(wrap("aaaa bbbb cccc dddd", 7, 2)).toEqual(["aaaa", "bbbb..."]);
    expect(wrap("aaaa bbbb", 9, 1)).toEqual(["aaaa bbbb"]);
  });

  test("breaks after a hyphen only before a letter", () => {
    expect(wrap("a b-2 c", 3, 5)).toEqual(["a", "b-2", "c"]);
    expect(wrap("ab-cd", 4, 5)).toEqual(["ab-", "cd"]);
  });

  test("cuts a word longer than a line where the line ends", () => {
    expect(wrap("abcdefghij kl", 4, 5)).toEqual(["abcd", "efgh", "ij", "kl"]);
  });

  test("keeps every real description within three lines of the width", () => {
    for (const page of PAGES) {
      const lines = wrap(page.description, columns(48, 1088), 3);
      expect(lines.length).toBeLessThanOrEqual(3);
      expect(lines.every((line) => line.length <= 56)).toBe(true);
    }
  });
});

describe("fitSize", () => {
  test("keeps the size when the text fits one line, and shrinks it to fit when it doesn't", () => {
    expect(fitSize("Hundo", 128, 1088)).toBe(128);
    expect(fitSize("x".repeat(40), 128, 1088)).toBe(68);
  });

  test("fits every page's name at the size it picks", () => {
    for (const page of PAGES) {
      const { name } = cardFor(page);
      expect(name.length * fitSize(name, 128, 1088) * 0.4).toBeLessThanOrEqual(1088);
    }
  });
});

describe("cardFor", () => {
  test("the home page: the studio's name and line, the folders with their counts, and the bare address", () => {
    const card = cardFor(HOME_PAGE);
    expect(card.name).toBe("Jellycat Studio");
    expect(card.description).toBe("Web apps, World of Warcraft addons, engines and tools.");
    expect(card.tabs?.map((tab) => tab.name)).toEqual(["Web", "Addons", "Engines", "Tools"]);
    expect(card.tabs?.map((tab) => tab.count)).toEqual(FOLDERS.map((folder) => PROJECTS.filter((project) => project.folder === folder).length));
    expect(card.address).toBe("jellycat.fr");
    expect(card.kind).toBeUndefined();
  });

  test("a project: its name and kind from the data, its address", () => {
    const project = PROJECTS[0];
    const page = PAGES.find((candidate) => candidate.kind === "project" && candidate.slug === project.slug)!;
    expect(cardFor(page)).toEqual({ name: project.name, kind: project.kind, description: project.description, address: `jellycat.fr/projects/${project.slug}` });
  });

  test("a page that is no project has its name from its title, no kind and no tabs", () => {
    expect(cardFor(CONTACT_PAGE)).toEqual({ name: "Contact", description: CONTACT_PAGE.description, address: "jellycat.fr/contact" });
  });
});

describe("drawImage", () => {
  test("every page's image is a 1200x630 PNG under 60 KB with at most 16 colours", async () => {
    for (const page of PAGES) {
      const png = await drawImage(page, font);
      expect(png.length, page.path).toBeLessThan(60 * 1024);
      const meta = await sharp(png).metadata();
      expect([meta.format, meta.width, meta.height], page.path).toEqual(["png", PREVIEW_IMAGE.width, PREVIEW_IMAGE.height]);
      const pixels = await sharp(png).removeAlpha().raw().toBuffer();
      const colours = new Set<number>();
      for (let i = 0; i < pixels.length; i += 3) colours.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]);
      expect(colours.size, page.path).toBeLessThanOrEqual(16);
    }
    // Twenty-one images and their pixels: seconds on a busy machine, past the default 5.
  }, 30_000);

  test("stops on a character VT323 has no glyph for, rather than drawing a fallback", async () => {
    const page = { kind: "project", slug: "none", path: "/projects/none", title: "None · Jellycat Studio", description: "Łódź" } satisfies Page;
    await expect(drawImage(page, font)).rejects.toThrow('VT323 has no glyph for "Łź" on /projects/none');
  });
});
