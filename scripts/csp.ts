// The Content-Security-Policy, written into every page at the end of the build (react-router.config.ts's buildEnd).
//
// React Router and React start each page with inline scripts (the hydration data, the module imports, scroll restoration, React's
// streaming code), a different set on each page, and a static site has no server to add a nonce. So each page carries its policy
// in a <meta http-equiv>, with the SHA-256 of each of its inline scripts in script-src: those run, and no other inline script
// does. The meta goes right after <meta charset>, before the first <script>, because a policy only covers what the browser parses
// after it. vercel.json's header adds what a meta tag can't carry (frame-ancestors). Nothing here runs in development: `pnpm dev`
// has no policy.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function policy(hashes: readonly string[]): string {
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval' lets the page compile WebAssembly (the Lab's gero.wasm) and nothing else: no eval, no inline script.
    ["script-src 'self' 'wasm-unsafe-eval'", ...hashes.map((hash) => `'${hash}'`)].join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
}

// The text the browser hashes is the bytes between the tags, with the one change its parser makes to any input: CR LF and a
// lone CR become LF.
function hash(script: string): string {
  return `sha256-${createHash("sha256").update(script.replace(/\r\n?/g, "\n"), "utf8").digest("base64")}`;
}

const CHARSET = /<meta\s(?:[^>]*\s)?charset\s*=[^>]*>/gi; // React writes `charSet`
const SCRIPT_TAG = /<script(?=[\s/>])/gi;
const SCRIPT = /<script(?=[\s/>])([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const POLICY_META = /<meta\s[^>]*http-equiv\s*=\s*["']?content-security-policy/i;

// The page with its policy inserted. Throws, naming the page, when there isn't exactly one place to put it before the first
// script, or when a script tag can't be read, since a script left out of the hashes would be blocked in the browser.
export function withPolicy(html: string, page: string): string {
  const fail = (why: string) => new Error(`CSP: ${page}: ${why}`);
  if (POLICY_META.test(html)) throw fail("already has a Content-Security-Policy meta");

  const charsets = [...html.matchAll(CHARSET)];
  if (charsets.length !== 1) throw fail(`expected one <meta charset>, found ${charsets.length}`);
  const at = charsets[0].index + charsets[0][0].length;
  const head = html.search(/<head[\s>]/i);
  const headEnd = html.search(/<\/head\s*>/i);
  if (head === -1 || at < head || headEnd < at) throw fail("<meta charset> is not inside <head>");
  const firstScript = html.search(SCRIPT_TAG);
  if (firstScript !== -1 && firstScript < at) throw fail("a <script> comes before <meta charset>");

  const scripts = [...html.matchAll(SCRIPT)];
  const tags = html.match(SCRIPT_TAG)?.length ?? 0;
  if (scripts.length !== tags) throw fail(`read ${scripts.length} of its ${tags} <script> tags`);
  const inline = scripts.filter(([, attributes]) => !/(?:^|\s)src\s*=/i.test(attributes));
  const hashes = [...new Set(inline.map(([, , text]) => hash(text)))];

  return `${html.slice(0, at)}<meta http-equiv="Content-Security-Policy" content="${policy(hashes)}"/>${html.slice(at)}`;
}

// Every .html file under the build's client folder, rewritten in place with its policy.
export async function writePolicies(client: string): Promise<void> {
  const pages = (await readdir(client, { recursive: true })).filter((file) => file.endsWith(".html"));
  if (pages.length === 0) throw new Error(`CSP: no HTML files in ${client}`);
  await Promise.all(
    pages.map(async (page) => {
      const path = join(client, page);
      await writeFile(path, withPolicy(await readFile(path, "utf8"), page));
    }),
  );
}
