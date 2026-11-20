import { PROJECTS } from "./projects";
import { loadReadme, parseReadme, README_SLUGS, readmeText, slugOf, type Block } from "./readme";

// Every README, read here at once (the site loads each on first use), and parsed: one outside the subset fails here,
// naming its file and line.
const SOURCES = import.meta.glob<string>("../content/readme/*.md", { query: "?raw", import: "default", eager: true });
const READMES = new Map(Object.entries(SOURCES).map(([path, source]) => [slugOf(path), parseReadme(source, `app/content/readme/${slugOf(path)}.md`)]));

// The shape the user approved: the project's name as the title, a paragraph saying what it is, then these two sections.
const SECTIONS = ["How it's built", "How it's checked"];

// A few hundred words, as docs/design.md's Readme says.
const WORDS = { min: 250, max: 500 };

// The site's words rule: no taglines or filler, nothing private.
const BANNED = [/—/, /\b(seamless(ly)?|robust|powerful|cutting-edge|leverag(e|es|ing)|showcas(e|es|ing)|delve|effortless(ly)?)\b/i, /~\/|\/Users\//];

// The words a reader reads: each link as its words, no `#`, `-` or backticks.
const words = (blocks: readonly Block[]) =>
  blocks
    .flatMap((block) => {
      if (block.kind === "list") return block.items.flat().map((part) => part.text);
      if (block.kind === "paragraph") return block.content.map((part) => part.text);
      return [block.text];
    })
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

test("every project has a README, and every README is a project's", () => {
  expect([...READMES.keys()].sort()).toEqual(PROJECTS.map((p) => p.slug).sort());
  expect([...README_SLUGS].sort()).toEqual(PROJECTS.map((p) => p.slug).sort());
});

test("loadReadme gives a project's parsed README, the same promise each time, and nothing for an unknown slug", async () => {
  const first = loadReadme("hundo");
  expect(first).toBe(loadReadme("hundo"));
  expect(await first).toEqual(READMES.get("hundo"));
  expect(loadReadme("opus")).toBeUndefined();
});

describe.each(PROJECTS.map((p) => [p.slug, p] as const))("%s's README", (slug, project) => {
  const blocks = READMES.get(slug) ?? [];

  test("is titled with the project's name and opens with what it is", () => {
    expect(blocks[0]).toEqual({ kind: "title", text: project.name });
    const intro = blocks[1];
    expect(intro?.kind).toBe("paragraph");
    if (intro?.kind === "paragraph") expect(readmeText([intro]).startsWith(`${project.name} is `), readmeText([intro])).toBe(true);
  });

  test("has exactly the approved sections, in order, each with something under it", () => {
    const headings = blocks.flatMap((block, i) => (block.kind === "heading" ? [[block.text, blocks[i + 1]?.kind] as const] : []));
    expect(headings.map(([text]) => text)).toEqual(SECTIONS);
    for (const [text, next] of headings) expect(["paragraph", "list"], text).toContain(next);
  });

  test(`runs ${WORDS.min} to ${WORDS.max} words`, () => {
    const count = words(blocks);
    expect(count).toBeGreaterThanOrEqual(WORDS.min);
    expect(count).toBeLessThanOrEqual(WORDS.max);
  });

  test("has no em dash, filler word or local path", () => {
    const text = readmeText(blocks);
    for (const rule of BANNED) expect(text).not.toMatch(rule);
  });
});

describe("parseReadme", () => {
  const ok = "# Hundo\n\nHundo is a `pnpm` workspace, see [hundo.quest](https://hundo.quest) and [harness](/projects/harness).\n\n## How it's built\n\n- one\n- two `x`\n";

  test("reads the subset into blocks", () => {
    expect(parseReadme(ok)).toEqual([
      { kind: "title", text: "Hundo" },
      {
        kind: "paragraph",
        content: [
          { kind: "text", text: "Hundo is a " },
          { kind: "code", text: "pnpm" },
          { kind: "text", text: " workspace, see " },
          { kind: "link", text: "hundo.quest", href: "https://hundo.quest" },
          { kind: "text", text: " and " },
          { kind: "project", text: "harness", slug: "harness" },
          { kind: "text", text: "." },
        ],
      },
      { kind: "heading", text: "How it's built" },
      { kind: "list", items: [[{ kind: "text", text: "one" }], [{ kind: "text", text: "two " }, { kind: "code", text: "x" }]] },
    ]);
  });

  test("keeps markup characters inside a code span", () => {
    expect(parseReadme("# A\n\nRun `bun init.ts <project> | tail` and `snake_case`.\n")[1]).toEqual({
      kind: "paragraph",
      content: [
        { kind: "text", text: "Run " },
        { kind: "code", text: "bun init.ts <project> | tail" },
        { kind: "text", text: " and " },
        { kind: "code", text: "snake_case" },
        { kind: "text", text: "." },
      ],
    });
  });

  test.each([
    ["an empty file", "", 1],
    ["a file of blank lines", "\n\n", 1],
    ["no title first", "Hundo is.\n", 1],
    ["a second title", "# A\n\n# B\n", 3],
    ["a third-level heading", "# A\n\n### B\n", 3],
    ["a hard-wrapped paragraph", "# A\n\nOne line\nrunning on.\n", 4],
    ["a list straight after a paragraph", "# A\n\nText.\n- item\n", 4],
    ["a blank line inside a list", "# A\n\n- one\n\n- two\n", 5],
    ["a nested list", "# A\n\n- one\n  - two\n", 4],
    ["a numbered list", "# A\n\n1. one\n", 3],
    ["a star list", "# A\n\n* one\n", 3],
    ["bold", "# A\n\nSome **bold** words.\n", 3],
    ["italics", "# A\n\nSome _italic_ words.\n", 3],
    ["HTML", "# A\n\nSome <b>bold</b>.\n", 3],
    ["a table", "# A\n\n| a | b |\n", 3],
    ["a code block", "# A\n\n```\ncode\n```\n", 3],
    ["a quote", "# A\n\n> quoted\n", 3],
    ["a rule", "# A\n\n---\n", 3],
    ["an image", "# A\n\nSee ![shot](https://a.b/c.png).\n", 3],
    ["an http link", "# A\n\nSee [it](http://a.b).\n", 3],
    ["a link to an unknown project", "# A\n\nSee [it](/projects/opus).\n", 3],
    ["a relative link", "# A\n\nSee [it](docs/a.md).\n", 3],
    ["an unclosed code span", "# A\n\nRun `bun test.\n", 3],
    ["a code span in a heading", "# A\n\n## The `q.ts` runner\n", 3],
    ["trailing space", "# A \n", 1],
    ["two blank lines", "# A\n\n\nText.\n", 3],
    ["no final newline", "# A", 1],
    ["two final newlines", "# A\n\n", 3],
    ["a carriage return", "# A\r\n", 1],
  ])("refuses %s, naming the line", (_what, source, line) => {
    expect(() => parseReadme(source, "x.md")).toThrow(new RegExp(`^x\\.md:${line}: `));
  });
});
