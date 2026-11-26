// The contact form's rules, read by both sides: the form in the browser (its `maxLength`s, its honeypot) and the function that
// relays it (`contact-handler.ts`), so the two never disagree. Nothing here runs only on Node.

/** The fields a visitor fills, in the form's order. */
export const CONTACT_FIELDS = ["name", "email", "message"] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

export type ContactMessage = Record<ContactField, string>;

/**
 * Each field's longest value, counted as the browser's `maxLength` counts (UTF-16 code units, so `String.length`). An email
 * address can't be longer than 254 characters (RFC 5321's path limit, less its angle brackets).
 */
export const CONTACT_LIMITS: Record<ContactField, number> = { name: 100, email: 254, message: 5000 };

/**
 * The honeypot's field name: a field off screen that people never see and bots fill. Not a word any browser's autofill knows
 * (`website`, `url`, `company`, `name`...), since autofill filling it for a real visitor would show them a false success.
 */
export const HONEYPOT_FIELD = "jc_trap";

/** How long, in milliseconds, the form was open: the form sends it under this name. */
export const ELAPSED_FIELD = "elapsed";

/** A form sent sooner than this after it opened is refused (and the visitor told to try again), never answered as sent. */
export const MIN_ELAPSED_MS = 2000;

/** The largest request body the function reads, in bytes: the three fields at their limits fit with room to spare. */
export const BODY_LIMIT = 16 * 1024;

/**
 * The browser's own test for `<input type="email">` (the HTML standard's "valid email address"): no spaces, line breaks,
 * commas, quotes or angle brackets can get through it.
 */
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * True for an address the browser accepts that can also be delivered: its domain has a dot (`a@b` passes the browser), and
 * the part before the `@` is at most 64 characters with no dot at either end or two in a row (RFC 5321 and 5322), so the
 * visitor hears about the address rather than about a message that didn't go.
 */
export function isEmail(value: string): boolean {
  if (!EMAIL.test(value)) return false;
  const at = value.indexOf("@");
  const local = value.slice(0, at);
  return value.slice(at + 1).includes(".") && local.length <= 64 && !/^\.|\.\.|\.$/.test(local);
}

/** Half of a surrogate pair on its own: JSON's `\ud800` escape makes one, and no e-mail can carry it. */
const LONE_SURROGATE = /\p{Cs}/u;

/**
 * The name on one line, as it goes in the subject and the e-mail's first line: control and format characters (line breaks,
 * Unicode's line and paragraph separators, bidi overrides, zero-width marks) become spaces, and runs of spaces one, so a
 * name can neither start another header nor fake another line of the e-mail.
 */
export function oneLine(name: string): string {
  return name
    .replace(/[\p{C}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const filled = (value: string) => value.trim() !== "";

const VALID: Record<ContactField, (value: string) => boolean> = {
  name: (value) => oneLine(value) !== "",
  email: isEmail,
  message: filled,
};

export type ContactValidation = { ok: true; value: ContactMessage } | { ok: false; fields: ContactField[] };

/**
 * Checks a submitted object: each field a well-formed string within its limit, the name and message not blank, the address
 * valid.
 */
export function validateContact(input: Record<string, unknown>): ContactValidation {
  const value: Partial<ContactMessage> = {};
  const fields: ContactField[] = [];
  for (const field of CONTACT_FIELDS) {
    const raw = input[field];
    if (typeof raw === "string" && raw.length <= CONTACT_LIMITS[field] && !LONE_SURROGATE.test(raw) && VALID[field](raw)) value[field] = raw;
    else fields.push(field);
  }
  return fields.length === 0 ? { ok: true, value: value as ContactMessage } : { ok: false, fields };
}

/** Why the function refused a message; the form says so to the visitor. */
export type ContactError =
  /** Not a POST. */
  | "method"
  /** Not sent from a page of the site itself. */
  | "origin"
  /** Not JSON. */
  | "type"
  /** Over `BODY_LIMIT`. */
  | "size"
  /** Not a JSON object. */
  | "json"
  /** A field failed `validateContact`; `fields` names them. */
  | "invalid"
  /** Sent under `MIN_ELAPSED_MS` after the form opened. */
  | "fast"
  /** The deployment has no key to send with. */
  | "unconfigured"
  /** The provider refused the message or didn't answer. */
  | "upstream"
  /** The function failed on its own. */
  | "internal";

/** What the function answers, as JSON. */
export type ContactReply = { ok: true } | { ok: false; error: ContactError; fields?: ContactField[] };
