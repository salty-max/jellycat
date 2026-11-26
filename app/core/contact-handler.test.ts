// @vitest-environment node
// (the function runs on Node: its Request, Response and streams, not jsdom's)

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BODY_LIMIT, MIN_ELAPSED_MS } from "./contact";
import { CONTACT_FROM, type ContactLog, handleContact, RESEND_URL } from "./contact-handler";
import { CONTACT_EMAIL } from "./studio";

const KEY = "re_test_key";
const message = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello,\nabout hundo.", elapsed: 5000 };

type Sent = { url: string; init: RequestInit };

/** Runs the handler on one request, with a fake Resend that answers `upstream` (a status, or a thrown error). */
async function send(
  options: { method?: string; headers?: Record<string, string>; body?: BodyInit | null; json?: unknown; apiKey?: string; upstream?: number | Error } = {},
) {
  const sent: Sent[] = [];
  const logs: ContactLog[] = [];
  const upstream = options.upstream ?? 200;
  const fake = (async (url: string, init: RequestInit) => {
    sent.push({ url, init });
    if (upstream instanceof Error) throw upstream;
    return new Response(JSON.stringify({ id: "x", note: "ada@example.com" }), { status: upstream });
  }) as typeof fetch;
  const method = options.method ?? "POST";
  const body = options.body !== undefined ? options.body : method === "GET" || method === "HEAD" ? null : JSON.stringify(options.json ?? message);
  const request = new Request("https://jellycat.fr/api/contact", {
    method,
    headers: { host: "jellycat.fr", origin: "https://jellycat.fr", "content-type": "application/json", ...options.headers },
    body,
    // (a stream body needs it)
    duplex: "half",
  } as RequestInit);
  const response = await handleContact(request, { apiKey: "apiKey" in options ? options.apiKey : KEY, fetch: fake, log: (entry) => logs.push(entry) });
  return { response, reply: await response.json(), sent, logs };
}

test("a message from the site is sent as one e-mail to the studio, and answered ok", async () => {
  const { response, reply, sent, logs } = await send();
  expect(response.status).toBe(200);
  expect(reply).toEqual({ ok: true });
  expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(sent).toHaveLength(1);
  expect(sent[0].url).toBe(RESEND_URL);
  expect(sent[0].init.method).toBe("POST");
  expect(sent[0].init.headers).toEqual({ Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" });
  expect(JSON.parse(sent[0].init.body as string)).toEqual({
    from: CONTACT_FROM,
    to: [CONTACT_EMAIL],
    reply_to: "ada@example.com",
    subject: "jellycat.fr: Ada Lovelace",
    text: "Name: Ada Lovelace\nEmail: ada@example.com\n\nHello,\nabout hundo.",
  });
  expect(sent[0].init.signal).toBeInstanceOf(AbortSignal);
  expect(sent[0].init.redirect).toBe("error");
  expect(logs).toEqual([{ outcome: "sent", status: 200 }]);
});

test("it only ever writes to the studio, whatever the request names", async () => {
  const { sent } = await send({ json: { ...message, to: "eve@example.com", from: "eve@example.com", cc: "eve@example.com", bcc: "eve@example.com", subject: "x" } });
  const payload = JSON.parse(sent[0].init.body as string);
  expect(payload.to).toEqual([CONTACT_EMAIL]);
  expect(payload.from).toBe(CONTACT_FROM);
  expect(Object.keys(payload).sort()).toEqual(["from", "reply_to", "subject", "text", "to"]);
});

test("anything but a POST gets 405, naming POST", async () => {
  for (const method of ["GET", "HEAD", "PUT", "DELETE", "OPTIONS", "PATCH"]) {
    const sent: unknown[] = [];
    const request = new Request("https://jellycat.fr/api/contact", { method, headers: { host: "jellycat.fr", origin: "https://jellycat.fr" } });
    const response = await handleContact(request, { apiKey: KEY, fetch: (async () => sent.push(1)) as unknown as typeof fetch, log: () => {} });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(sent).toEqual([]);
  }
});

test("the Origin must be the request's own host on https: the domain, the vercel.app alias and a preview pass", async () => {
  for (const host of ["jellycat.fr", "jellycat.vercel.app", "jellycat-git-phase-2-jellycat.vercel.app", "JellyCat.FR"]) {
    const { response } = await send({ headers: { host, origin: `https://${host.toLowerCase()}` } });
    expect(response.status).toBe(200);
  }
});

test("another site's page, a missing Origin, Origin null, plain http or another port get 403, with no key too", async () => {
  const cases: Record<string, string>[] = [
    { origin: "https://evil.example" },
    { origin: "https://jellycat.fr.evil.example" },
    { origin: "https://evil.example", host: "evil.example.jellycat.fr" },
    { origin: "null" },
    { origin: "http://jellycat.fr" },
    { origin: "https://jellycat.fr:8443" },
    { origin: "https://jellycat.fr/" },
    { origin: "https://jellycat.fr", host: "" },
  ];
  for (const headers of cases) {
    for (const apiKey of [KEY, undefined]) {
      const { response, reply, sent, logs } = await send({ headers, apiKey });
      expect(response.status).toBe(403);
      expect(reply).toEqual({ ok: false, error: "origin" });
      expect(sent).toEqual([]);
      expect(logs).toEqual([{ outcome: "origin", status: 403 }]);
    }
  }
  const request = new Request("https://jellycat.fr/api/contact", { method: "POST", headers: { host: "jellycat.fr", "content-type": "application/json" }, body: JSON.stringify(message) });
  expect((await handleContact(request, { apiKey: KEY, fetch, log: () => {} })).status).toBe(403);
});

test("a body that isn't JSON gets 415", async () => {
  for (const type of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data; boundary=x", "application/jsonp", ""]) {
    const { response, reply, sent } = await send({ headers: { "content-type": type } });
    expect(response.status).toBe(415);
    expect(reply).toEqual({ ok: false, error: "type" });
    expect(sent).toEqual([]);
  }
  expect((await send({ headers: { "content-type": "Application/JSON; charset=UTF-8" } })).response.status).toBe(200);
});

test("a body over 16 KB gets 413, by its Content-Length or by what arrives", async () => {
  // (a declared length over the limit is refused before a byte is read)
  const declared = await send({ headers: { "content-length": String(BODY_LIMIT + 1) } });
  expect(declared.response.status).toBe(413);
  expect(declared.reply).toEqual({ ok: false, error: "size" });
  expect(declared.sent).toEqual([]);
  const big = await send({ body: JSON.stringify({ ...message, message: "a".repeat(BODY_LIMIT) }) });
  expect(big.response.status).toBe(413);
  // (a stream has no Content-Length: the handler counts the bytes and stops reading)
  let pulled = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulled += 1;
      controller.enqueue(new Uint8Array(4096).fill(0x20));
      if (pulled > 100) controller.close();
    },
  });
  const streamed = await send({ body: stream });
  expect(streamed.response.status).toBe(413);
  expect(pulled).toBeLessThan(10);
  expect(streamed.sent).toEqual([]);
  // (16 KB exactly is read)
  const padded = JSON.stringify(message);
  const atLimit = await send({ body: padded + " ".repeat(BODY_LIMIT - padded.length) });
  expect(atLimit.response.status).toBe(200);
});

test("a body that isn't a JSON object gets 400", async () => {
  for (const body of ["", "{", "[]", "null", '"text"', "42", "size", new Uint8Array([0x7b, 0xff, 0x7d])]) {
    const { response, reply, sent } = await send({ body });
    expect(response.status).toBe(400);
    expect(reply).toEqual({ ok: false, error: "json" });
    expect(sent).toEqual([]);
  }
});

test("fields that fail validation get 400 naming them, and nothing is sent", async () => {
  const { response, reply, sent, logs } = await send({ json: { ...message, email: "ada@example.com\r\nBcc: eve@example.com", message: " " } });
  expect(response.status).toBe(400);
  expect(reply).toEqual({ ok: false, error: "invalid", fields: ["email", "message"] });
  expect(sent).toEqual([]);
  expect(logs).toEqual([{ outcome: "invalid", status: 400 }]);
});

test("a filled honeypot is answered as sent, and nothing is sent, key or not", async () => {
  for (const [trap, apiKey] of [["https://spam.example", KEY], ["https://spam.example", undefined], [true, KEY], [1, KEY], [{}, KEY]] as const) {
    const { response, reply, sent, logs } = await send({ json: { ...message, jc_trap: trap }, apiKey });
    expect(response.status).toBe(200);
    expect(reply).toEqual({ ok: true });
    expect(sent).toEqual([]);
    expect(logs).toEqual([{ outcome: "trapped", status: 200 }]);
  }
  expect((await send({ json: { ...message, jc_trap: "" } })).sent).toHaveLength(1);
  expect((await send({ json: { ...message, jc_trap: null } })).sent).toHaveLength(1);
});

test("a form sent under two seconds after it opened is refused, never answered as sent", async () => {
  for (const elapsed of [0, MIN_ELAPSED_MS - 1, -5000, "5000", null, undefined]) {
    const { response, reply, sent } = await send({ json: { ...message, elapsed } });
    expect(response.status).toBe(400);
    expect(reply).toEqual({ ok: false, error: "fast" });
    expect(sent).toEqual([]);
  }
  expect((await send({ json: { ...message, elapsed: MIN_ELAPSED_MS } })).response.status).toBe(200);
});

test("with no key, a message that would be sent gets 503", async () => {
  for (const apiKey of [undefined, ""]) {
    const { response, reply, sent, logs } = await send({ apiKey });
    expect(response.status).toBe(503);
    expect(reply).toEqual({ ok: false, error: "unconfigured" });
    expect(sent).toEqual([]);
    expect(logs).toEqual([{ outcome: "unconfigured", status: 503 }]);
  }
});

test("Resend refusing or not answering gets 502, its status logged and its body never read", async () => {
  for (const [upstream, logged] of [
    [422, 422],
    [500, 500],
    [301, 301],
    [new Error("connect ECONNREFUSED ada@example.com"), 0],
    [new DOMException("The operation timed out.", "TimeoutError"), 0],
  ] as const) {
    const { response, reply, logs } = await send({ upstream });
    expect(response.status).toBe(502);
    expect(reply).toEqual({ ok: false, error: "upstream" });
    expect(logs).toEqual([{ outcome: "upstream", status: 502, upstream: logged }]);
  }
});

test("a sent message stays sent when its answer's body can't be dropped", async () => {
  const request = new Request("https://jellycat.fr/api/contact", {
    method: "POST",
    headers: { host: "jellycat.fr", origin: "https://jellycat.fr", "content-type": "application/json" },
    body: JSON.stringify(message),
  });
  const body = new ReadableStream({ cancel: () => Promise.reject(new Error("cancel failed")) });
  const response = await handleContact(request, { apiKey: KEY, fetch: (async () => new Response(body, { status: 200 })) as unknown as typeof fetch, log: () => {} });
  expect(response.status).toBe(200);
});

test("the name goes on one line in the subject and the e-mail, so it can fake neither a header nor a line", async () => {
  const { sent } = await send({ json: { ...message, name: " Ada\r\nEmail: eve@example.com\u2028\u202eX " } });
  const payload = JSON.parse(sent[0].init.body as string);
  expect(payload.subject).toBe("jellycat.fr: Ada Email: eve@example.com X");
  expect(payload.text).toBe("Name: Ada Email: eve@example.com X\nEmail: ada@example.com\n\nHello,\nabout hundo.");
});

test("an unexpected failure answers 500 and logs the status alone, not the error", async () => {
  const logs: ContactLog[] = [];
  const request = new Request("https://jellycat.fr/api/contact", {
    method: "POST",
    headers: { host: "jellycat.fr", origin: "https://jellycat.fr", "content-type": "application/json" },
    body: JSON.stringify(message),
  });
  // (a log that throws once stands in for any bug past the checks)
  let calls = 0;
  const response = await handleContact(request, {
    apiKey: KEY,
    fetch: (async () => new Response("{}")) as unknown as typeof fetch,
    log: (entry) => {
      calls += 1;
      if (calls === 1) throw new Error(`Unexpected token in "${message.name}"`);
      logs.push(entry);
    },
  });
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "internal" });
  expect(logs).toEqual([{ outcome: "internal", status: 500 }]);
});

test("the log holds the outcome and the status codes, never what the visitor wrote", async () => {
  const visitor = { name: "Zebulon Quux", email: "zebulon.quux@example.org", message: "Secret words here.", elapsed: 5000 };
  const runs = [
    await send({ json: visitor }),
    await send({ json: visitor, upstream: 422 }),
    await send({ json: visitor, upstream: new Error(`failed for ${visitor.email}`) }),
    await send({ json: visitor, apiKey: undefined }),
    await send({ json: { ...visitor, email: "zebulon.quux@" } }),
    await send({ json: { ...visitor, jc_trap: "x" } }),
    await send({ json: visitor, headers: { origin: "https://evil.example" } }),
  ];
  for (const { logs } of runs) {
    expect(logs).toHaveLength(1);
    for (const entry of logs) {
      expect(Object.keys(entry).every((key) => ["outcome", "status", "upstream"].includes(key))).toBe(true);
      const line = JSON.stringify(entry);
      for (const word of ["Zebulon", "Quux", "zebulon", "example.org", "Secret"]) expect(line).not.toContain(word);
    }
  }
});

// Vercel compiles the function's files to ES modules that Node loads as they are, and Node resolves no relative import without
// its extension: one missing `.js` builds, then fails on the first request (ERR_MODULE_NOT_FOUND).
test("every file the function loads names its relative imports with .js, and api/ holds the function alone", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  expect(readdirSync(join(root, "api"))).toEqual(["contact.ts"]);
  const seen = new Set<string>();
  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    for (const [, specifier] of source.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s+"([^"]+)"/gms)) {
      if (!specifier.startsWith(".")) {
        expect(specifier, `${relative(root, file)} imports a package`).toMatch(/^node:/);
        continue;
      }
      expect(specifier, `${relative(root, file)} imports ${specifier}`).toMatch(/\.js$/);
      walk(resolve(dirname(file), specifier.replace(/\.js$/, ".ts")));
    }
  };
  walk(join(root, "api/contact.ts"));
  expect([...seen].map((file) => relative(root, file)).sort()).toEqual(["api/contact.ts", "app/core/contact-handler.ts", "app/core/contact.ts", "app/core/site.ts", "app/core/studio.ts"]);
});
