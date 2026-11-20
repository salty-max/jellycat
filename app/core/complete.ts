// Tab completion and history, as pure functions over the line, ported from `mockups/phosphor-shell.html`.

import { nodeAt, resolve, sortedChildren } from "./fs";
import { COMMAND_NAMES } from "./shell";

export interface Completion {
  /** The line after Tab. */
  line: string;
  /** Several names fit and share no more letters: the host prints the line it echoes, then these. */
  options: string[];
}

/**
 * Completes the last word of the line. The first word is a command; any later one is a path (a word after `&&` counts as a
 * path too, as in the mockup). One match fills the word in, followed by a space unless it is a directory; several fill in
 * what they share, or, when that adds nothing, come back as `options`.
 */
export function complete(line: string, cwd: readonly string[]): Completion {
  const words = line.split(" ");
  const last = words[words.length - 1];
  let matches: string[];
  if (words.length === 1) {
    matches = COMMAND_NAMES.filter((name) => name.startsWith(last));
  } else {
    const slash = last.lastIndexOf("/");
    const dir = slash >= 0 ? last.slice(0, slash + 1) : "";
    const start = last.slice(slash + 1);
    const node = nodeAt(resolve(cwd, dir || "."));
    matches = node?.kind === "dir" ? sortedChildren(node).filter((child) => child.name.startsWith(start)).map((child) => dir + child.name + (child.kind === "dir" ? "/" : "")) : [];
  }
  if (!matches.length) return { line, options: [] };
  let shared = matches[0];
  for (const match of matches) while (!match.startsWith(shared)) shared = shared.slice(0, -1);
  const done = (word: string) => ({ line: [...words.slice(0, -1), word].join(" "), options: [] });
  if (matches.length === 1) return done(matches[0] + (matches[0].endsWith("/") ? "" : " "));
  if (shared.length > last.length) return done(shared);
  const names = matches.map((match) => (match.split("/").filter(Boolean).pop() ?? "") + (match.endsWith("/") ? "/" : ""));
  return { line, options: names };
}

/**
 * ↑ and ↓ through the history. `index` is where the cursor stands, `history.length` meaning past the newest (the
 * empty prompt); the result is the new index and the line to show, or `null` when the key does nothing.
 */
export function historyStep(history: readonly string[], index: number, direction: "up" | "down"): { index: number; line: string } | null {
  if (direction === "up") return index > 0 ? { index: index - 1, line: history[index - 1] } : null;
  return index < history.length ? { index: index + 1, line: history[index + 1] ?? "" } : null;
}
