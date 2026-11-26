// @vitest-environment node
import { describe, expect, test } from "vitest";
import { policy, withPolicy } from "./csp";

const HASH = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

describe("policy", () => {
  test("script-src allows the site, WebAssembly and the pages' own inline scripts, in that order", () => {
    expect(policy([HASH]).split("; ")[1]).toBe(`script-src 'self' 'wasm-unsafe-eval' '${HASH}'`);
  });

  test("allows WebAssembly and not eval", () => {
    expect(policy([])).not.toMatch(/'unsafe-eval'/);
    expect(policy([]).split("; ")[1]).toBe("script-src 'self' 'wasm-unsafe-eval'");
  });

  test("keeps fetches, forms, plugins and the base to the site, so the module is fetched from the site and from nowhere else", () => {
    const directives = policy([]).split("; ");
    for (const directive of ["default-src 'self'", "connect-src 'self'", "form-action 'self'", "object-src 'none'", "base-uri 'self'"]) expect(directives).toContain(directive);
  });
});

describe("withPolicy", () => {
  test("writes the policy, the WebAssembly source included, into a page", () => {
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><script>window.a = 1</script></head><body></body></html>';
    expect(withPolicy(html, "p")).toMatch(/<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self' 'wasm-unsafe-eval' 'sha256-[A-Za-z0-9+/]{43}=';/);
  });
});
