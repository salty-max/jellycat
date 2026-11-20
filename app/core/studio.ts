// The studio's own files: the Readme (the desktop's Readme window, and `~/README` in the shell) and `~/contact.txt`.

/** A stretch of a line: plain text, or a link (`mailto:` or `https:`) the OS renders as one. */
export type Span = string | { text: string; href: string };

/** A text file, as lines of spans. An empty line is `[]`. */
export type TextFile = readonly (readonly Span[])[];

export const STUDIO_NAME = "Jellycat Studio";

/** The address the site shows. Mail goes there; the site has no form until Phase 2. */
export const CONTACT_EMAIL = "max@jellycat.fr";

export const GITHUB_URL = "https://github.com/salty-max";

const email: Span = { text: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` };

export const README: TextFile = [
  [STUDIO_NAME],
  [],
  ["Web apps, World of Warcraft addons, engines and tools."],
  [],
  ["Each project has a README in the projects folder."],
  ["Contact: ", email],
];

export const CONTACT: TextFile = [
  ["Email   ", email],
  ["GitHub  ", { text: GITHUB_URL.replace(/^https:\/\//, ""), href: GITHUB_URL }],
];

/** The file as plain text, each link as its text. */
export function plainText(file: TextFile): string {
  return file.map((line) => line.map((span) => (typeof span === "string" ? span : span.text)).join("")).join("\n");
}
