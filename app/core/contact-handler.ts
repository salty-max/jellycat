// The contact form's function: one POST from a page of the site becomes one plain-text e-mail to the studio, sent through
// Resend's HTTP API. It keeps nothing, and it only ever writes to the studio's own address, so it can't mail anyone else.
// `api/contact.ts` hands it the request, the key and the platform's `fetch` and log.
//
// Vercel compiles this file to an ES module that Node loads as it is, and Node resolves no relative import without its
// extension: every relative import below names the `.js` the build writes (TypeScript and Vite map it back to the `.ts`).
// contact-handler.test.ts holds every file the function loads to that.

import {
  BODY_LIMIT,
  type ContactError,
  type ContactField,
  type ContactReply,
  ELAPSED_FIELD,
  HONEYPOT_FIELD,
  MIN_ELAPSED_MS,
  oneLine,
  validateContact,
} from "./contact.js";
import { SITE_URL } from "./site.js";
import { CONTACT_EMAIL } from "./studio.js";

/** Resend's endpoint for sending one e-mail. */
export const RESEND_URL = "https://api.resend.com/emails";

/** The sender: an address on the studio's own domain, which Resend sends from only once that domain is verified there. */
export const CONTACT_FROM = "contact@jellycat.fr";

/** How long Resend gets to answer before the visitor is told the message didn't go. */
const RESEND_TIMEOUT_MS = 10_000;

/** What happened to a request, as the log line names it. */
export type ContactOutcome = "sent" | "trapped" | ContactError;

/** The one line logged per request: what happened and the status code, and Resend's status when it refused. Nothing else. */
export type ContactLog = { outcome: ContactOutcome; status: number; upstream?: number };

export type ContactDeps = {
  /** `RESEND_API_KEY`; missing or empty, every message that would be sent gets a 503. */
  apiKey: string | undefined;
  fetch: typeof fetch;
  log: (entry: ContactLog) => void;
};

/** The subject's prefix: the site's own host, `jellycat.fr`. */
const SUBJECT_PREFIX = `${new URL(SITE_URL).host}: `;

/**
 * Answers one request. Whatever goes wrong inside answers 500 with the same one log line: an error left to the platform
 * would be logged with its message, and a JSON parser's message quotes the text it was given.
 */
export async function handleContact(request: Request, deps: ContactDeps): Promise<Response> {
  try {
    return await handle(request, deps);
  } catch {
    deps.log({ outcome: "internal", status: 500 });
    return reply(500, { ok: false, error: "internal" });
  }
}

function reply(status: number, body: ContactReply): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  if (status === 405) headers.Allow = "POST";
  return new Response(JSON.stringify(body), { status, headers });
}

async function handle(request: Request, deps: ContactDeps): Promise<Response> {
  const answer = (status: number, body: ContactReply, outcome: ContactOutcome, upstream?: number): Response => {
    deps.log(upstream === undefined ? { outcome, status } : { outcome, status, upstream });
    return reply(status, body);
  };
  const refuse = (status: number, error: ContactError, fields?: ContactField[]) =>
    answer(status, fields ? { ok: false, error, fields } : { ok: false, error }, error);

  if (request.method !== "POST") return refuse(405, "method");
  if (!fromSite(request)) return refuse(403, "origin");
  if (mediaType(request.headers.get("content-type")) !== "application/json") return refuse(415, "type");

  const read = await readBody(request);
  if (read === "size") return refuse(413, "size");
  const body = read === "unreadable" ? undefined : parseObject(read.text);
  if (!body) return refuse(400, "json");

  // A bot filled the field people can't see: it is told the message went, and nothing is sent.
  const trap = body[HONEYPOT_FIELD];
  if (trap !== undefined && trap !== null && trap !== "") return answer(200, { ok: true }, "trapped");

  const checked = validateContact(body);
  if (!checked.ok) return refuse(400, "invalid", checked.fields);
  const elapsed = body[ELAPSED_FIELD];
  if (typeof elapsed !== "number" || !Number.isFinite(elapsed) || elapsed < MIN_ELAPSED_MS) return refuse(400, "fast");

  if (!deps.apiKey) return refuse(503, "unconfigured");

  const { email, message } = checked.value;
  const name = oneLine(checked.value.name);
  let status: number;
  try {
    const response = await deps.fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${deps.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_EMAIL],
        reply_to: email,
        subject: SUBJECT_PREFIX + name,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
      // (a redirect would carry the message somewhere else: it fails instead, as a 502)
      redirect: "error",
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    status = response.status;
    // (the body is never read: Resend's error may quote the address; a failed cancel can't turn a sent message into a 502)
    await response.body?.cancel().catch(() => {});
  } catch {
    // (no answer in time, or no connection: the error's text is not logged either)
    status = 0;
  }
  if (status < 200 || status > 299) return answer(502, { ok: false, error: "upstream" }, "upstream", status);
  return answer(200, { ok: true }, "sent");
}

/**
 * True when the request comes from a page of the host it was sent to. A browser always sends `Origin` with a POST, so a
 * page of another site fails, and so does a request with none (`curl`, or `Origin: null` from a sandboxed frame). The host
 * is the request's own: the domain, the vercel.app alias and any preview each pass for themselves.
 */
function fromSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  return origin !== null && host !== null && host !== "" && origin.toLowerCase() === `https://${host.toLowerCase()}`;
}

/** The media type of a `Content-Type` header, without its parameters, in lower case. */
function mediaType(header: string | null): string {
  return (header ?? "").split(";", 1)[0].trim().toLowerCase();
}

/** The body as UTF-8 text, read no further than `BODY_LIMIT` bytes; "size" past it, "unreadable" when it isn't UTF-8. */
async function readBody(request: Request): Promise<{ text: string } | "size" | "unreadable"> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > BODY_LIMIT) return "size";
  if (!request.body) return { text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > BODY_LIMIT) {
      await reader.cancel();
      return "size";
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return "unreadable";
  }
}

/** The text parsed as JSON when it is an object (not an array, a string or `null`); otherwise undefined. */
function parseObject(text: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}
