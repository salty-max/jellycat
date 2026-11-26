import {
  AUTHORITY,
  HOST,
  HOST_LOG_DAYS,
  PRIVACY_NOTICE,
  PROCESSOR,
  RETENTION_DAYS,
  SAFEGUARD,
  SENDING_REGION,
} from "./privacy";
import { CONTACT_EMAIL, plainText } from "./studio";

const text = plainText(PRIVACY_NOTICE);

test("no em dash or en dash", () => {
  expect(text).not.toMatch(/[\u2014\u2013]/);
});

test("the address is CONTACT_EMAIL, as a mailto link", () => {
  expect(PRIVACY_NOTICE.flat()).toContainEqual({ text: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` });
});

test("it names the processor and how long it keeps the e-mail", () => {
  expect(PROCESSOR).toBe("Resend");
  expect(RETENTION_DAYS).toBe(30);
  expect(text).toContain(PROCESSOR);
  expect(text).toContain(`${RETENTION_DAYS} days`);
});

test("it says the kept copy is in the US, whatever the sending region", () => {
  expect(text).toContain(`keeps them ${RETENTION_DAYS} days in the US`);
});

test("it names the transfer's safeguard and what the host logs, for how long", () => {
  expect(text).toContain(`in the US, under ${SAFEGUARD}.`);
  expect(SAFEGUARD).toBe("the EU's standard contractual clauses");
  expect([1, 30]).toContain(HOST_LOG_DAYS);
  expect(text).toContain(`${HOST}, which hosts this site, sees each request's IP address and keeps the site's logs ${HOST_LOG_DAYS} days.`);
});

test("the sending region is Resend's real one, Ireland (U1), with no placeholder left", () => {
  expect(SENDING_REGION).toBe("Ireland");
  expect(text).toContain("sends them from Ireland and keeps them");
  expect(text).not.toMatch(/placeholder|\[|\]/i);
});

test("it gives the legal basis, the right to object it brings, and the authority to complain to", () => {
  expect(text).toContain("or to object to its use");
  expect(text).toContain("The legal basis is the studio's interest in answering messages sent to it.");
  expect(text).toContain(`You can also complain to ${AUTHORITY}.`);
  expect(AUTHORITY).toMatch(/^the CNIL\b/);
});

test("every link is mailto or https, and no span is empty", () => {
  for (const span of PRIVACY_NOTICE.flat()) {
    if (typeof span === "string") expect(span).not.toBe("");
    else expect(span.href).toMatch(/^(mailto:[^\s@]+@[^\s@]+|https:\/\/\S+)$/);
  }
});

test("the words are the ones put to the user (Q8): a change goes back to the user", () => {
  expect(text).toBe(
    `Jellycat Studio receives your name, email and message to answer you. The legal basis is the studio's interest in answering messages sent to it. Resend, a US company, sends them from Ireland and keeps them 30 days in the US, under the EU's standard contractual clauses. The studio's inbox keeps them while the exchange lasts. Vercel, which hosts this site, sees each request's IP address and keeps the site's logs 30 days.\n` +
      `To see, correct or delete your data, or to object to its use, write to ${CONTACT_EMAIL}. You can also complain to the CNIL, France's data protection authority.`,
  );
});
