// The link preview images, drawn at the end of the build (react-router.config.ts's buildEnd): one 1200x630 PNG for each page in
// app/core/pages.ts, written to build/client/og/ (`og/index.png`, `og/projects/<slug>.png`, `og/contact.png`), the file each
// page's `og:image` names (app/core/site.ts).
//
// satori lays each image out from a plain object tree and draws VT323's glyphs as paths (sharp's own text rendering can't load the
// woff), sharp turns the SVG into a PNG with a 16-colour palette: one phosphor and its glow need no more, and the text stays
// sharp. The look is the mockup's `#og-hundo` and `#og-home` (docs/design.md, Link previews): the tube's black, the green phosphor,
// the glow, and scanlines baked in at twice the screen's pitch, so a preview shown at half size still has them.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";
import satori from "satori";
import sharp from "sharp";
import { FOLDERS, FOLDER_NAMES, PROJECTS } from "../app/core/projects";
import type { Page } from "../app/core/pages";
import { OS_NAME, OS_VERSION, PREVIEW_IMAGE, SITE_URL, pageImagePath } from "../app/core/site";
import { README, STUDIO_NAME, plainText } from "../app/core/studio";
import { brandSvg } from "../app/brand/art";

const { width: WIDTH, height: HEIGHT } = PREVIEW_IMAGE;

// The green phosphor, its dim tone and the tube's black (app/app.css): a preview has no settings, so it is always the default.
const FG = "#33ff66";
const DIM = "#1a9c40";
const BG = "#031208";

const FONT_URL = new URL("../node_modules/@fontsource/vt323/files/vt323-latin-400-normal.woff", import.meta.url);

// VT323 is monospaced: every glyph advances 0.4 em, so how many characters fit a line is arithmetic.
export const ADVANCE = 0.4;
const MARGIN = 56;
const TEXT_WIDTH = WIDTH - 2 * MARGIN;
const TEXT_SIZE = 48;
const NAME_SIZE = 128;
const DESCRIPTION_LINES = 3;
// The home page has its tabs under the description, so the description gets one line fewer: three would reach the footer.
const HOME_DESCRIPTION_LINES = 2;

/** What an image says: read from the page and its data, nothing else. */
export type Card = {
  /** The page's name, large. */
  name: string;
  /** What the page is, dim, under the name (a project's kind); none for a page that is not a thing. */
  kind?: string;
  /** Up to three lines. */
  description: string;
  /** The folders, as framed tabs with their counts (the home page's). */
  tabs?: readonly { name: string; count: number }[];
  /** The page's address, dim, bottom left. */
  address: string;
};

/** What an image says for this page. */
export function cardFor(page: Page): Card {
  const address = `${SITE_URL.replace(/^https?:\/\//, "")}${page.path === "/" ? "" : page.path}`;
  if (page.kind === "home") {
    return {
      name: page.title,
      // The studio's line, as the README file's third line holds it.
      description: plainText([README[2]]),
      tabs: FOLDERS.map((folder) => ({ name: FOLDER_NAMES[folder], count: PROJECTS.filter((project) => project.folder === folder).length })),
      address,
    };
  }
  // A page's title is "<name> · Jellycat Studio".
  const name = page.title.replace(` · ${STUDIO_NAME}`, "");
  const project = page.kind === "project" ? PROJECTS.find((candidate) => candidate.slug === page.slug) : undefined;
  return { name, kind: project?.kind, description: page.description, address };
}

/** The most characters a line of this size holds in `width` pixels. */
export function columns(size: number, width: number): number {
  return Math.floor(width / (size * ADVANCE));
}

/**
 * `text` broken into lines of at most `max` characters, as a browser breaks them in the cases the data has: at its spaces and after
 * a hyphen that joins a word to a letter (`single-` / `player`). It is cut at `lines` lines, and the last one ends in `...` when the text goes on. A word longer than a line is cut
 * where the line ends.
 */
export function wrap(text: string, max: number, lines: number): string[] {
  // A piece is a word, or the start of one up to a hyphen; `space` says whether a space comes before it.
  const pieces: { text: string; space: boolean }[] = [];
  for (const word of text.split(/[ \t\r\n]+/).filter(Boolean)) {
    word.match(/[^-]+-+(?=\p{L})|.+/gu)?.forEach((piece, index) => pieces.push({ text: piece, space: index === 0 }));
  }
  const out: string[] = [];
  let line = "";
  for (const { text: piece, space } of pieces) {
    let rest = piece;
    while (rest.length > max) {
      if (line) out.push(line);
      line = "";
      out.push(rest.slice(0, max));
      rest = rest.slice(max);
    }
    const joined = line && space ? `${line} ${rest}` : `${line}${rest}`;
    if (line && joined.length > max) {
      out.push(line);
      line = rest;
    } else line = joined;
  }
  if (line) out.push(line);
  if (out.length <= lines) return out;
  const kept = out.slice(0, lines);
  // The three dots take three cells: drop what they'd cover, then any space left before them.
  kept[lines - 1] = `${kept[lines - 1].slice(0, max - 3).trimEnd()}...`;
  return kept;
}

/** The largest size, up to `size`, at which `text` fits one line of `width` pixels. */
export function fitSize(text: string, size: number, width: number): number {
  return Math.min(size, Math.floor(width / (text.length * ADVANCE)));
}

type Style = Record<string, string | number>;
type Node = { type: string; props: { style?: Style; children?: Node | string | (Node | string)[]; [key: string]: unknown } };

const el = (type: string, style: Style, children?: Node | string | (Node | string)[], props: Record<string, unknown> = {}): Node => ({
  type,
  props: { ...props, style, children },
});

// The approved mark, with opaque counters as in the live menu bar.
function icon(size: number): Node {
  const svg = brandSvg({ ink: FG, counter: BG, width: size });
  return el("img", { width: size, height: size }, undefined, { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, width: size, height: size });
}

const GLOW = `0 0 4px ${DIM}`;
const line = (text: string, style: Style = {}) => el("div", { display: "flex", whiteSpace: "pre", textShadow: GLOW, ...style }, text);

/** The image's layout, as the mockup's `.og` frame: a title bar, the body, and the footer. */
export function layout(card: Card): Node {
  const nameSize = fitSize(card.name, NAME_SIZE, TEXT_WIDTH);
  const lines = wrap(card.description, columns(TEXT_SIZE, TEXT_WIDTH), card.tabs ? HOME_DESCRIPTION_LINES : DESCRIPTION_LINES);
  const body: Node[] = [line(card.name, { fontSize: nameSize, lineHeight: "120px" })];
  if (card.kind) body.push(line(wrap(card.kind, columns(TEXT_SIZE, TEXT_WIDTH), 1)[0], { color: DIM, marginTop: 10 }));
  body.push(el("div", { display: "flex", flexDirection: "column", marginTop: 26 }, lines.map((text) => line(text))));
  if (card.tabs) {
    body.push(
      el(
        "div",
        { display: "flex", marginTop: 40 },
        card.tabs.map((tab, index) =>
          el(
            "div",
            { display: "flex", border: `2px solid ${FG}`, padding: "6px 18px", marginLeft: index ? 20 : 0, boxShadow: `6px 6px 0 ${DIM}` },
            // One run of text with the count in an inline span, as the mockup has it: two boxes would each round its width up.
            el("div", { display: "block", whiteSpace: "pre", textShadow: GLOW }, [`${tab.name} `, el("span", { color: DIM }, String(tab.count))]),
          ),
        ),
      ),
    );
  }
  return el(
    "div",
    { display: "flex", flexDirection: "column", width: WIDTH, height: HEIGHT, background: BG, color: FG, fontFamily: "VT323", fontSize: TEXT_SIZE, lineHeight: 1.15, position: "relative" },
    [
      el("div", { display: "flex", alignItems: "center", height: 80, padding: `0 ${MARGIN}px`, borderBottom: `2px solid ${FG}` }, [
        icon(48),
        line(STUDIO_NAME, { marginLeft: 18 }),
      ]),
      el("div", { display: "flex", flexDirection: "column", padding: `44px ${MARGIN}px 0` }, body),
      el(
        "div",
        { display: "flex", justifyContent: "space-between", position: "absolute", left: MARGIN, right: MARGIN, bottom: 40, color: DIM, fontSize: 40 },
        [line(card.address), line(`${OS_NAME} ${OS_VERSION}`)],
      ),
    ],
  );
}

// The scanlines: 2px of the tube's black every 6px, at 28%, over everything. Baked in at twice the screen's 3px pitch so a
// preview shown at half size still has them. No vignette: it darkens the corners a small preview crops.
function scanlines(): string {
  let rects = "";
  for (let y = 0; y < HEIGHT; y += 6) rects += `<rect x="0" y="${y}" width="${WIDTH}" height="2"/>`;
  return `<g fill="#000" fill-opacity="0.28">${rects}</g>`;
}

/** One page's image, as PNG bytes. */
export async function drawImage(page: Page, font: Buffer): Promise<Buffer> {
  // satori calls this for a character the font has no glyph for. The characters are kept and the draw fails after it, so the error
  // names the page and every character at once. A page's words must come out in VT323, never in a fallback.
  const missing: string[] = [];
  const svg = await satori(layout(cardFor(page)) as unknown as ReactNode, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: "VT323", data: font, weight: 400, style: "normal" }],
    loadAdditionalAsset: async (_code, segment) => {
      missing.push(segment);
      return [];
    },
  });
  if (missing.length) throw new Error(`VT323 has no glyph for ${missing.map((text) => JSON.stringify(text)).join(", ")} on ${page.path}`);
  return sharp(Buffer.from(svg.replace(/<\/svg>$/, `${scanlines()}</svg>`)))
    .png({ palette: true, colours: 16 })
    .toBuffer();
}

/** Every page's image, written under `client` at the path its `og:image` names. */
export async function writeImages(client: string, pages: readonly Page[]): Promise<void> {
  const font = await readFile(fileURLToPath(FONT_URL));
  for (const page of pages) {
    const file = join(client, pageImagePath(page.path));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, await drawImage(page, font));
  }
}
