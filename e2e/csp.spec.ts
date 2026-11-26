import { readdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { policy, withPolicy } from "../scripts/csp";

// Every page the build wrote carries its Content-Security-Policy (scripts/csp.ts), and Chrome runs it under that policy without a
// violation, all the way to a hydrated page. The files are read inside the test, since Playwright collects tests before its web
// server runs the build, so one test per page can't be generated; the one test walks them all, each as a named step, and its timeout grows
// with the number of pages instead of sitting at Playwright's 30 s default.
const CLIENT = "build/client";
// The budget each page adds to the test: a page takes about 1.5 s alone (31 s for 21 pages), so this leaves room for a loaded machine.
const PER_PAGE = 10_000;

// The policy with its hashes taken out, as scripts/csp.ts writes it.
const POLICY =
  /^default-src 'self'; script-src 'self' 'wasm-unsafe-eval'(?: 'sha256-[A-Za-z0-9+/]{43}=')*; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; object-src 'none'; base-uri 'self'$/;

// Where Vercel serves a file: index.html at its folder, 404.html at any address with no file (nested, as a typo would be).
function address(file: string): string {
  return file === "404.html" ? "/csp/no/such/page" : `/${file.replace(/(?:^|\/)index\.html$/, "")}`;
}

type Probe = { violations: string[]; injected?: boolean };

test("every page runs under its Content-Security-Policy", async ({ context }) => {
  const files = readdirSync(CLIENT, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".html"));
  expect(files).toEqual(expect.arrayContaining(["index.html", "404.html"]));
  test.setTimeout(30_000 + files.length * PER_PAGE);

  // Registered before any page script runs, so a violation during parsing is caught too.
  await context.addInitScript(() => {
    const probe: Probe = { violations: [] };
    (window as unknown as { probe: Probe }).probe = probe;
    document.addEventListener("securitypolicyviolation", (event) => probe.violations.push(`${event.effectiveDirective} ${event.blockedURI}`));
  });
  const probe = (page: Page) => page.evaluate(() => (window as unknown as { probe: Probe }).probe);

  for (const file of files) {
    await test.step(file, async () => {
      // In the file: one policy, before the first script.
      const html = readFileSync(`${CLIENT}/${file}`, "utf8");
      const meta = html.indexOf('<meta http-equiv="Content-Security-Policy"');
      expect(meta).toBeGreaterThan(-1);
      expect(html.indexOf('<meta http-equiv="Content-Security-Policy"', meta + 1)).toBe(-1);
      const firstScript = html.search(/<script[\s>]/);
      if (firstScript !== -1) expect(meta).toBeLessThan(firstScript);

      const page = await context.newPage();
      const url = address(file);
      const errors: string[] = [];
      page.on("response", (response) => {
        if (response.status() >= 400 && new URL(response.url()).pathname !== url) errors.push(`${response.status()} ${response.url()}`);
      });
      page.on("console", (message) => {
        if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));

      const response = await page.goto(url);
      expect(response?.status()).toBe(file === "404.html" ? 404 : 200);
      await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute("content", POLICY);
      await page.waitForLoadState("networkidle");
      expect((await probe(page)).violations).toEqual([]);
      expect(errors).toEqual([]);
      // Hydrated: React has claimed the prerendered <body> (it keeps its fiber on each DOM node it owns, under this key since React
      // 17). A blocked script stops it before that.
      await page.waitForFunction(() => Object.keys(document.body).some((key) => key.startsWith("__reactFiber$")), undefined, { timeout: PER_PAGE });

      // And the policy is enforced, not only present: an inline script added now is refused.
      await page.evaluate(() => {
        const script = document.createElement("script");
        script.textContent = "window.probe.injected = true";
        document.head.append(script);
      });
      await expect.poll(async () => (await probe(page)).violations).toEqual(["script-src-elem inline"]);
      expect((await probe(page)).injected).toBeUndefined();
      await page.close();
    });
  }
});

// The step's own checks, on pages made up here. Plain Node, no browser: the unit tests only cover app/. Today's build never hits
// these, so without this a check could go missing unnoticed until a React or React Router upgrade changes the markup.
const fixture = (head: string, body = "") => `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`;

test("the policy step refuses a page it can't cover", () => {
  expect(() => withPolicy(fixture("<title>x</title>"), "p")).toThrow("expected one <meta charset>, found 0");
  expect(() => withPolicy(fixture('<meta charset="utf-8"><meta charSet="utf-8"/>'), "p")).toThrow("expected one <meta charset>, found 2");
  expect(() => withPolicy(fixture('<script>1</script><meta charset="utf-8">'), "p")).toThrow("a <script> comes before <meta charset>");
  expect(() => withPolicy('<html><head></head><body><meta charset="utf-8"></body></html>', "p")).toThrow("<meta charset> is not inside <head>");
  expect(() => withPolicy(fixture('<meta charset="utf-8"><META HTTP-EQUIV="content-security-policy" content="x">'), "p")).toThrow("already has");
  expect(() => withPolicy(fixture('<meta charset="utf-8">', "<script>1</script><script>2"), "p")).toThrow("read 1 of its 2 <script> tags");
});

test("the policy step hashes each inline script as the browser reads it", () => {
  const html = fixture('<meta charset="utf-8"><script src="/a.js"></script>', '<script>é("x")</script><script data-src="y">a\r\nb</script><script>é("x")</script>');
  // The SHA-256 of é("x") in UTF-8 and of "a\nb" (the parser reads CR LF as LF), from openssl; the external script and the
  // repeated one add nothing.
  const hashes = ["sha256-kLDwge+q5Hmh5OdsUs4+SsLo/Csh+bLs7Dl96SECPUc=", "sha256-fhj3NzEbLcOy8mndeDlrA1HxT7Zu+oefdoyyMYGIPHg="];
  expect(withPolicy(html, "p")).toBe(html.replace('<meta charset="utf-8">', (charset) => `${charset}<meta http-equiv="Content-Security-Policy" content="${policy(hashes)}"/>`));
});
