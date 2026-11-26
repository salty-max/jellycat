import { CONTACT_LIMITS, HONEYPOT_FIELD, isEmail, oneLine, validateContact } from "./contact";

const good = { name: "Ada", email: "ada@example.com", message: "Hello." };

test("a message with the three fields filled passes, as it was sent", () => {
  expect(validateContact(good)).toEqual({ ok: true, value: good });
});

test("each field is held to its limit, counted as the browser's maxLength counts", () => {
  const at = (field: "name" | "message", length: number) => validateContact({ ...good, [field]: "a".repeat(length) });
  for (const field of ["name", "message"] as const) {
    expect(at(field, CONTACT_LIMITS[field]).ok).toBe(true);
    expect(at(field, CONTACT_LIMITS[field] + 1)).toEqual({ ok: false, fields: [field] });
  }
  const local = "a".repeat(64);
  const longest = `${local}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
  expect(longest).toHaveLength(CONTACT_LIMITS.email);
  expect(validateContact({ ...good, email: longest }).ok).toBe(true);
  expect(validateContact({ ...good, email: `a${longest}` })).toEqual({ ok: false, fields: ["email"] });
  // (an emoji is two code units, as maxLength counts it)
  expect(validateContact({ ...good, name: "\u{1F408}".repeat(50) }).ok).toBe(true);
  expect(validateContact({ ...good, name: "\u{1F408}".repeat(51) }).ok).toBe(false);
});

test("the name and the message need more than white space, and the name more than invisible characters", () => {
  expect(validateContact({ ...good, name: "  \n\t", message: "" })).toEqual({ ok: false, fields: ["name", "message"] });
  expect(validateContact({ ...good, name: "\u200b\u202e\u0000" })).toEqual({ ok: false, fields: ["name"] });
});

test("a lone half of a surrogate pair, which JSON's escapes can make, fails its field", () => {
  const lone = JSON.parse('{"name":"Ada \\ud800","email":"ada@example.com","message":"Hi \\udc00"}');
  expect(validateContact(lone)).toEqual({ ok: false, fields: ["name", "message"] });
  expect(validateContact({ ...good, name: "Ada \u{1F408}" }).ok).toBe(true);
});

test("one line: control and format characters become a space, runs of spaces one", () => {
  expect(oneLine("Ada\r\nBcc: eve@example.com")).toBe("Ada Bcc: eve@example.com");
  expect(oneLine(" Ada\u2028X\u2029Y\u0085Z\u0000\tW\u202eV\u200bU ")).toBe("Ada X Y Z W V U");
});

test("a missing field or one that isn't a string fails, each named in the form's order", () => {
  expect(validateContact({})).toEqual({ ok: false, fields: ["name", "email", "message"] });
  expect(validateContact({ ...good, email: ["ada@example.com"], message: 5 })).toEqual({ ok: false, fields: ["email", "message"] });
});

test("an address is what the browser accepts, with a dot in its domain", () => {
  for (const ok of ["ada@example.com", "a.b+c@mail.example.co.uk", "x_y-z@sub-domain.example"]) expect(isEmail(ok)).toBe(true);
  for (const bad of [
    "ada@localhost",
    "ada",
    "@example.com",
    "ada@",
    "ada@-example.com",
    "ada @example.com",
    "ada@example.com\r\nBcc: eve@example.com",
    "ada@example.com\nX: y",
    "Ada <ada@example.com>",
    "ada@example.com, eve@example.com",
    '"ada"@example.com',
    ".ada@example.com",
    "ada.@example.com",
    "a..da@example.com",
    `${"a".repeat(65)}@example.com`,
  ])
    expect(isEmail(bad)).toBe(false);
});

test("the honeypot's name is not one a browser's autofill would fill", () => {
  expect(HONEYPOT_FIELD).not.toMatch(/name|mail|phone|tel|address|company|org|url|website|city|zip|postal|country/i);
});
