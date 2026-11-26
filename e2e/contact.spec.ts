import { expect, test, type Page, type Route } from "@playwright/test";
import { ELAPSED_FIELD, HONEYPOT_FIELD } from "../app/core/contact";

// The contact form on both layouts, against the production build. scripts/serve.mjs serves files only, so /api/contact is stubbed
// here: what the form sends is read from the request, and each test gives the answer it needs (the function's own answers are
// tested in app/core/contact-handler.test.ts). The phone's page is /contact; the desktop's window opens from its icon or at that address.

type Stub = { bodies: Record<string, unknown>[]; answer: (route: Route) => Promise<void> | void };

/** Stubs the function: `answer` replies to each post, `bodies` collects what was posted. */
async function stub(page: Page, answer: Stub["answer"] = (route) => route.fulfill({ json: { ok: true } })): Promise<Stub> {
  const stubbed: Stub = { bodies: [], answer };
  await page.route("**/api/contact", (route) => {
    stubbed.bodies.push(route.request().postDataJSON() as Record<string, unknown>);
    return stubbed.answer(route);
  });
  return stubbed;
}

const reply = (status: number, json: unknown) => (route: Route) => route.fulfill({ status, json });

async function openForm(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.goto("/contact");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "phone");
    return page.getByRole("main");
  }
  await page.goto("/");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
  await page.getByRole("option", { name: "Contact" }).dblclick();
  const window = page.getByRole("dialog", { name: "Contact" });
  await expect(window).toBeVisible();
  return window;
}

async function fill(form: ReturnType<Page["getByRole"]>, values = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello from the test." }) {
  await form.getByLabel("Name").fill(values.name);
  await form.getByLabel("Email").fill(values.email);
  await form.getByLabel("Message").fill(values.message);
}

test("sends the message, says so, and empties the form", async ({ page, isMobile }) => {
  const function_ = await stub(page);
  const form = await openForm(page, isMobile);
  await fill(form);
  // The function refuses a form open under two seconds: wait it out as a visitor would.
  await page.waitForTimeout(2100);
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByRole("status")).toHaveText("Message sent.");
  expect(function_.bodies).toHaveLength(1);
  const body = function_.bodies[0];
  expect(body).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com", message: "Hello from the test.", [HONEYPOT_FIELD]: "" });
  expect(body[ELAPSED_FIELD]).toBeGreaterThanOrEqual(2000);
  await expect(form.getByLabel("Name")).toHaveValue("");
  await expect(form.getByLabel("Message")).toHaveValue("");
});

test("shows Sending... while the function answers", async ({ page, isMobile }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await stub(page, async (route) => {
    await held;
    await route.fulfill({ json: { ok: true } });
  });
  const form = await openForm(page, isMobile);
  await fill(form);
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByRole("status")).toHaveText("Sending...");
  release();
  await expect(form.getByRole("status")).toHaveText("Message sent.");
});

test("a field the function refuses is marked, explained and focused", async ({ page, isMobile }) => {
  await stub(page, reply(400, { ok: false, error: "invalid", fields: ["email"] }));
  const form = await openForm(page, isMobile);
  await fill(form, { name: "Ada", email: "ada@b.c", message: "Hi" });
  await form.getByRole("button", { name: "Send" }).click();
  const email = form.getByLabel("Email");
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription("Enter a valid email address.");
  await expect(form.getByLabel("Name")).not.toHaveAttribute("aria-invalid", "true");
  // The message stays, for the visitor to fix the address.
  await expect(form.getByLabel("Message")).toHaveValue("Hi");
  await email.fill("ada@example.com");
  await expect(email).not.toHaveAttribute("aria-invalid", "true");
});

test("a form sent too soon says to try again, and keeps the message", async ({ page, isMobile }) => {
  await stub(page, reply(400, { ok: false, error: "fast" }));
  const form = await openForm(page, isMobile);
  await fill(form);
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByRole("status")).toHaveText("Could not send the message. Try again.");
  await expect(form.getByLabel("Message")).toHaveValue("Hello from the test.");
});

test("a deployment with no key, and a network that drops, both say to write to the address", async ({ page, isMobile }) => {
  const function_ = await stub(page, reply(503, { ok: false, error: "unconfigured" }));
  const form = await openForm(page, isMobile);
  await fill(form);
  await form.getByRole("button", { name: "Send" }).click();
  const status = form.getByRole("status");
  await expect(status).toHaveText("Could not send the message. Write to max@jellycat.fr.");
  await expect(status.getByRole("link", { name: "max@jellycat.fr" })).toHaveAttribute("href", "mailto:max@jellycat.fr");

  function_.answer = (route) => route.abort("connectionreset");
  await form.getByRole("button", { name: "Send" }).click();
  await expect(status).toHaveText("Could not send the message. Write to max@jellycat.fr.");
  await expect(form.getByLabel("Message")).toHaveValue("Hello from the test.");
});

test("the browser's own validation stops an empty form before anything is posted", async ({ page, isMobile }) => {
  const function_ = await stub(page);
  const form = await openForm(page, isMobile);
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByLabel("Name")).toBeFocused();
  expect(function_.bodies).toEqual([]);
});

test("the notice is the approved text, with the honeypot out of sight", async ({ page, isMobile }) => {
  const form = await openForm(page, isMobile);
  const notice = form.getByRole("region", { name: "Privacy notice" });
  await expect(notice).toContainText("Jellycat Studio receives your name, email and message to answer you.");
  await expect(notice.getByRole("link", { name: "max@jellycat.fr" })).toHaveAttribute("href", "mailto:max@jellycat.fr");
  const trap = page.locator(`input[name="${HONEYPOT_FIELD}"]`);
  await expect(trap).toHaveAttribute("tabindex", "-1");
  const box = await trap.boundingBox();
  expect(box && box.x + box.width < 0, "off screen").toBe(true);
});

test.describe("the desktop's window", () => {
  test.skip(({ isMobile }) => isMobile, "the desktop is for computers");

  test("opens over Projects at /contact, and closing it goes back to /", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
    const contact = page.getByRole("dialog", { name: "Contact" });
    await expect(contact).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Projects" })).toBeVisible();
    await expect(contact.getByText("To", { exact: true })).toBeVisible();
    await expect(contact.getByText("max@jellycat.fr", { exact: true }).first()).toBeVisible();
    await expect(contact.getByLabel("Name")).toBeFocused();
    await contact.getByRole("button", { name: "Close" }).click();
    await expect(contact).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test("opened from its icon it leaves the address, and stays open, with what was typed, when the address moves on", async ({ page }) => {
    await page.goto("/projects/hundo");
    const info = page.getByRole("dialog", { name: "Hundo Info" });
    await expect(info).toBeVisible();
    await page.getByRole("option", { name: "Contact" }).dblclick();
    const contact = page.getByRole("dialog", { name: "Contact" });
    await contact.getByLabel("Message").fill("Half a message");
    await expect(page).toHaveURL(/\/projects\/hundo$/);
    // Closing the Info window takes the address back to the desktop; Contact is not the address's, so it stays as it was.
    await info.getByRole("button", { name: "Close" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(contact.getByLabel("Message")).toHaveValue("Half a message");
  });

  test("is sent with the keyboard alone", async ({ page }) => {
    const function_ = await stub(page);
    await page.goto("/contact");
    const contact = page.getByRole("dialog", { name: "Contact" });
    await expect(contact.getByLabel("Name")).toBeFocused();
    await page.keyboard.type("Ada");
    await page.keyboard.press("Tab");
    await page.keyboard.type("ada@example.com");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Hello by keyboard.");
    // The notice is a tab stop (it scrolls), its address the next, then Send.
    await page.keyboard.press("Tab");
    await expect(contact.getByRole("region", { name: "Privacy notice" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(contact.getByRole("link", { name: "max@jellycat.fr" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(contact.getByRole("button", { name: "Send" })).toBeFocused();
    await page.waitForTimeout(2100);
    await page.keyboard.press("Enter");
    await expect(contact.getByRole("status")).toHaveText("Message sent.");
    expect(function_.bodies[0]).toMatchObject({ name: "Ada", email: "ada@example.com", message: "Hello by keyboard." });
  });
});

test.describe("the phone's page", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone's page");

  test("is a page linked from the home page's Contact section", async ({ page }) => {
    await page.goto("/");
    const section = page.getByRole("region", { name: "Contact" });
    await expect(section.getByText("A message from this page goes by email to max@jellycat.fr.")).toBeVisible();
    await section.getByRole("link", { name: "Contact" }).tap();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "max@jellycat.fr" }).first()).toHaveAttribute("href", "mailto:max@jellycat.fr");
    await expect(page.getByRole("main").getByRole("link", { name: "github.com/salty-max" })).toHaveAttribute("href", "https://github.com/salty-max");
  });

  test("has fields 44px tall at 20px, Message six lines, and Send the column's width", async ({ page }) => {
    await page.goto("/contact");
    for (const name of ["Name", "Email"]) {
      const field = page.getByLabel(name);
      expect((await field.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await field.evaluate((element) => getComputedStyle(element).fontSize)).toBe("20px");
    }
    expect((await page.getByLabel("Message").boundingBox())!.height).toBe(160);
    const send = (await page.getByRole("button", { name: "Send" }).boundingBox())!;
    expect(send.height).toBeGreaterThanOrEqual(56);
    expect(send.width).toBeGreaterThan(300);
  });
});
