// Each project's README: `app/content/readme/<slug>.md`, a few hundred words on what the project is, how it's built and
// how it's checked. The files are written in a small Markdown subset, parsed here into blocks that the shell's `cat`,
// `less` and `more`, the desktop's README window and the project page all render. Anything outside the subset is an
// error, so a README can't hold something no layout draws.

import { projectBySlug } from "./projects";

/** A stretch of a line: text, a code span, a link to a site, or a link to another project on this one. */
export type Inline =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string }
  | { kind: "project"; text: string; slug: string };

export type Block =
  | { kind: "title"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; content: readonly Inline[] }
  | { kind: "list"; items: readonly (readonly Inline[])[] };

export class ReadmeError extends Error {
  override name = "ReadmeError";
}

// A line that starts a construct the subset leaves out: a numbered or `*`/`+` list, a quote, a table, a fence, a rule.
const LEFT_OUT = /^(\d+[.)] |[*+] |>|\||```|~~~|-{3,}$|\*{3,}$|_{3,}$|=+$)/;

// Characters that mean emphasis, HTML, an escape or a table outside a code span.
const MARKUP = /[*_<>\\|\]]/;

/**
 * The README's blocks. Throws a `ReadmeError` naming the file and line of the first thing outside the subset: one
 * `# title` first, `##` headings, one-line paragraphs, one-level `- ` lists, a blank line between blocks, and inline
 * code spans and links (`https://…`, or `/projects/<slug>` for a project on the site).
 */
export function parseReadme(source: string, file = "README"): Block[] {
  const fail = (line: number, what: string): never => {
    throw new ReadmeError(`${file}:${line}: ${what}`);
  };
  if (source.trim() === "") fail(1, "an empty file");
  if (source.includes("\r")) fail(1, "a carriage return: lines end with \\n alone");
  const lines = source.split("\n");
  if (lines.length < 2 || lines.at(-1) !== "" || lines.at(-2) === "") fail(lines.length, "the file ends with exactly one newline");
  lines.pop();

  const blocks: Block[] = [];
  let afterBlank = true;
  lines.forEach((line, index) => {
    const at = index + 1;
    if (line === "") {
      if (afterBlank) fail(at, "two blank lines in a row, or a blank first line");
      afterBlank = true;
      return;
    }
    if (line !== line.trim() || line.includes("\t")) fail(at, "space or a tab at the start or end of a line (no indenting, no nested lists)");
    const last = blocks.at(-1);
    const nextItem = line.startsWith("- ") && last?.kind === "list";
    if (!afterBlank && !nextItem) fail(at, "a line that runs on from the one above: a paragraph is one line, and a blank line separates blocks");
    if (afterBlank && nextItem) fail(at, "a blank line inside a list");

    if (line.startsWith("# ")) {
      if (blocks.length > 0) fail(at, "a second title: only the first line is a `# ` title");
      blocks.push({ kind: "title", text: plain(line.slice(2), at, fail) });
    } else if (blocks.length === 0) {
      fail(at, "the first line is the title, `# Name`");
    } else if (line.startsWith("## ")) {
      blocks.push({ kind: "heading", text: plain(line.slice(3), at, fail) });
    } else if (line.startsWith("#")) {
      fail(at, "a heading other than `# ` and `## `");
    } else if (line.startsWith("- ")) {
      const item = inline(line.slice(2), at, fail);
      if (last?.kind === "list" && nextItem) blocks[blocks.length - 1] = { kind: "list", items: [...last.items, item] };
      else blocks.push({ kind: "list", items: [item] });
    } else if (LEFT_OUT.test(line)) {
      fail(at, "a numbered or `*` list, a quote, a table, a code block or a rule: the subset has none");
    } else {
      blocks.push({ kind: "paragraph", content: inline(line, at, fail) });
    }
    afterBlank = false;
  });
  return blocks;
}

type Fail = (line: number, what: string) => never;

// Text with no code spans or links: a title, a heading, a link's words.
function plain(text: string, at: number, fail: Fail): string {
  if (text.trim() === "") fail(at, "an empty title, heading or link");
  if (/[`[]/.test(text)) fail(at, "a code span or a link in a title, a heading or a link's words");
  bare(text, at, fail);
  return text;
}

function bare(text: string, at: number, fail: Fail): void {
  const mark = MARKUP.exec(text);
  if (mark) fail(at, `"${mark[0]}" outside a code span: no emphasis, HTML, escapes or tables`);
}

function inline(line: string, at: number, fail: Fail): Inline[] {
  if (line.trim() === "") fail(at, "an empty list item");
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (text === "") return;
    bare(text, at, fail);
    out.push({ kind: "text", text });
    text = "";
  };
  let i = 0;
  while (i < line.length) {
    const char = line[i];
    if (char === "`") {
      const end = line.indexOf("`", i + 1);
      if (end < 0) fail(at, "a code span with no closing backtick");
      const code = line.slice(i + 1, end);
      if (code.trim() === "" || code !== code.trim()) fail(at, "an empty or padded code span");
      flush();
      out.push({ kind: "code", text: code });
      i = end + 1;
    } else if (char === "[") {
      if (text.endsWith("!")) fail(at, "an image: the subset has none");
      const link = /^\[([^\]]*)\]\(([^)\s]*)\)/.exec(line.slice(i));
      if (!link) fail(at, "a [ that doesn't start a link, `[words](address)`");
      const [whole, words, href] = link!;
      plain(words, at, fail);
      flush();
      out.push(target(words, href, at, fail));
      i += whole.length;
    } else {
      text += char;
      i += 1;
    }
  }
  flush();
  return out;
}

function target(text: string, href: string, at: number, fail: Fail): Inline {
  if (/^https:\/\/[^\s/]+\.[^\s]+$/.test(href)) return { kind: "link", text, href };
  const project = /^\/projects\/([a-z0-9-]+)$/.exec(href);
  if (project && projectBySlug(project[1])) return { kind: "project", text, slug: project[1] };
  return fail(at, `a link to "${href}": an address is https://…, or /projects/<slug> for a project on the site`);
}

/** The README as plain text, each block on its own lines and each link as its words. */
export function readmeText(blocks: readonly Block[]): string {
  const line = (content: readonly Inline[]) => content.map((part) => part.text).join("");
  return blocks
    .map((block) => {
      if (block.kind === "list") return block.items.map((item) => `- ${line(item)}`).join("\n");
      if (block.kind === "paragraph") return line(block.content);
      return block.text;
    })
    .join("\n\n");
}

// Each README is a chunk of its own, loaded the first time it's read: all of them together are some 54 KB of text, and a
// visitor reads one at a time. readme.test.ts parses every file, so a README outside the subset fails the check.
const FILES = import.meta.glob<string>("../content/readme/*.md", { query: "?raw", import: "default" });

/** A README's slug from its path, `…/readme/<slug>.md`. */
export const slugOf = (path: string) => path.slice(path.lastIndexOf("/") + 1, -".md".length);

const LOADERS = new Map(Object.entries(FILES).map(([path, load]) => [slugOf(path), load]));

/** The slugs that have a README: every project's, as readme.test.ts holds. */
export const README_SLUGS: readonly string[] = [...LOADERS.keys()];

const loaded = new Map<string, Promise<readonly Block[]>>();

/**
 * The project's README, loaded and parsed on first use, or `undefined` for a slug without one. The same slug always
 * gets the same promise, so React's `use()` can read it and a page's loader can await it before the first render.
 */
export function loadReadme(slug: string): Promise<readonly Block[]> | undefined {
  const load = LOADERS.get(slug);
  if (!load) return undefined;
  let blocks = loaded.get(slug);
  if (!blocks) {
    blocks = load()
      .then((source) => parseReadme(source, `app/content/readme/${slug}.md`))
      .catch((error: unknown) => {
        // A chunk that failed to load (the network, or a deploy that replaced it) is tried again on the next read.
        loaded.delete(slug);
        throw error;
      });
    loaded.set(slug, blocks);
  }
  return blocks;
}
