import { SITE_URL } from "./site";
import { CONTACT, CONTACT_EMAIL, plainText, README, type TextFile } from "./studio";

const links = (file: TextFile) => file.flat().filter((span) => typeof span !== "string");

test("the Readme and contact.txt carry the address as a mailto link", () => {
  for (const file of [README, CONTACT]) {
    expect(links(file)).toContainEqual({ text: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` });
  }
});

test("every link is mailto or https, and no span is empty", () => {
  for (const file of [README, CONTACT]) {
    for (const span of file.flat()) {
      if (typeof span === "string") expect(span).not.toBe("");
      else expect(span.href).toMatch(/^(mailto:[^\s@]+@[^\s@]+|https:\/\/\S+)$/);
    }
  }
});

test("no placeholder address is left", () => {
  expect(plainText(README) + plainText(CONTACT)).not.toMatch(/placeholder|your-domain/);
});

test("plain text shows links as their text", () => {
  expect(plainText(CONTACT)).toBe(`Email   ${CONTACT_EMAIL}\nGitHub  github.com/salty-max`);
});

test("the site's address is https with no trailing slash", () => {
  expect(SITE_URL).toMatch(/^https:\/\/[^/\s]+$/);
});
