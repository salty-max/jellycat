import { CONTACT_FIELDS, ELAPSED_FIELD, HONEYPOT_FIELD, type ContactField, type ContactMessage } from "../../core/contact";

// What the form does with the function's answer (app/core/contact-handler.ts; the statuses are in app/core/contact.ts). Only
// two answers carry a reason the visitor can act on (a field to fix, a form sent too soon); everything else, a network that
// dropped, a status the form doesn't know, a reply that isn't JSON, is one generic failure.

/** Where the form posts: the function in this project, same origin (docs/phase-2.md, Q1). */
export const CONTACT_ENDPOINT = "/api/contact";

/** How long the form waits for the function before it says the message didn't go. */
export const SEND_TIMEOUT_MS = 20_000;

export type SendResult =
  /** The function sent it, or took the honeypot for a message. */
  | { kind: "sent" }
  /** These fields were refused, in the form's order. */
  | { kind: "invalid"; fields: ContactField[] }
  /** Sent under two seconds after the form opened. */
  | { kind: "fast" }
  /** Anything else: the function's `403`, `5xx`, a network error, a timeout. */
  | { kind: "failed" };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** What an answer says, from its status and its JSON body. */
export function interpret(ok: boolean, body: unknown): SendResult {
  if (!isObject(body)) return { kind: "failed" };
  if (ok && body.ok === true) return { kind: "sent" };
  if (body.error === "fast") return { kind: "fast" };
  if (body.error === "invalid" && Array.isArray(body.fields)) {
    const fields = CONTACT_FIELDS.filter((field) => (body.fields as unknown[]).includes(field));
    if (fields.length > 0) return { kind: "invalid", fields };
  }
  return { kind: "failed" };
}

/**
 * Posts the message with how long the form was open (`elapsed`, milliseconds) and the honeypot's value (`trap`, empty from a
 * visitor). `post` is `fetch`, passed in so a test needn't replace the global one.
 */
export async function sendContact(message: ContactMessage, elapsed: number, trap: string, post: typeof fetch = (...args) => fetch(...args)): Promise<SendResult> {
  try {
    const response = await post(CONTACT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...message, [ELAPSED_FIELD]: elapsed, [HONEYPOT_FIELD]: trap }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    return interpret(response.ok, await response.json());
  } catch {
    return { kind: "failed" };
  }
}
