import { ELAPSED_FIELD, HONEYPOT_FIELD } from "../../core/contact";
import { CONTACT_ENDPOINT, interpret, sendContact } from "./send";

const message = { name: "Ada", email: "ada@example.com", message: "Hello." };
const answer = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

test("posts JSON to the function, with how long the form was open and the honeypot, empty", async () => {
  const post = vi.fn(() => answer(200, { ok: true }));
  expect(await sendContact(message, 4321, "", post as unknown as typeof fetch)).toEqual({ kind: "sent" });
  const [url, init] = post.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe(CONTACT_ENDPOINT);
  expect(init.method).toBe("POST");
  expect(init.headers).toEqual({ "content-type": "application/json" });
  expect(JSON.parse(init.body as string)).toEqual({ ...message, [ELAPSED_FIELD]: 4321, [HONEYPOT_FIELD]: "" });
});

test("each answer is one result: sent, the fields refused (in the form's order), sent too soon, or failed", () => {
  expect(interpret(true, { ok: true })).toEqual({ kind: "sent" });
  expect(interpret(false, { ok: false, error: "invalid", fields: ["message", "email", "bogus"] })).toEqual({ kind: "invalid", fields: ["email", "message"] });
  expect(interpret(false, { ok: false, error: "fast" })).toEqual({ kind: "fast" });
  for (const error of ["origin", "method", "size", "type", "json", "unconfigured", "upstream", "internal", "something-new"]) {
    expect(interpret(false, { ok: false, error }), error).toEqual({ kind: "failed" });
  }
});

test("a success needs both the status and the body; an invalid answer naming no known field is a failure", () => {
  expect(interpret(false, { ok: true })).toEqual({ kind: "failed" });
  expect(interpret(true, { ok: false, error: "internal" })).toEqual({ kind: "failed" });
  expect(interpret(false, { ok: false, error: "invalid", fields: [] })).toEqual({ kind: "failed" });
  expect(interpret(false, { ok: false, error: "invalid", fields: ["bogus"] })).toEqual({ kind: "failed" });
  expect(interpret(false, { ok: false, error: "invalid" })).toEqual({ kind: "failed" });
});

test("a body that isn't a JSON object, and a network error, are failures", async () => {
  expect(interpret(true, null)).toEqual({ kind: "failed" });
  expect(interpret(true, "ok")).toEqual({ kind: "failed" });
  const html = () => Promise.resolve(new Response("<html>", { status: 502 }));
  expect(await sendContact(message, 3000, "", html as unknown as typeof fetch)).toEqual({ kind: "failed" });
  const down = () => Promise.reject(new TypeError("Failed to fetch"));
  expect(await sendContact(message, 3000, "", down as unknown as typeof fetch)).toEqual({ kind: "failed" });
});
