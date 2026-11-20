import { expect, test, type Page } from "@playwright/test";

// The OS once hydrated: the shell on a phone, the desktop's boot screen then its icons on a computer (e2e/layout.spec.ts has the rest).
async function expectOs(page: Page, phone: boolean) {
  if (phone) await expect(page.getByRole("log", { name: "Terminal output" })).toBeVisible();
  else {
    await expect(page.getByRole("heading", { name: "Jelly-OS 1.0" })).toBeVisible();
    await expect(page.getByRole("listbox", { name: "Desktop" })).toBeVisible();
  }
}

test("the home page is prerendered HTML", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain("<title>Jellycat Studio</title>");
  // Both layouts are in the page before any script runs: the shell's welcome and the desktop's boot screen.
  expect(html).toContain("Type help for the commands, or click a name.");
  expect(html).toContain("Jelly-OS 1.0");
});

test("the home page boots in the browser: the phone sees the shell, a computer the desktop", async ({ page }, info) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Jellycat Studio");
  await expectOs(page, info.project.name === "phone");
});

test("an unknown address answers 404 with the not-found page", async ({ request, page }, info) => {
  const res = await request.get("/no-such-page");
  expect(res.status()).toBe(404);
  expect(await res.text()).toContain("There&#x27;s no page at this address.");
  expect((await request.get("/assets/no-such-chunk.js")).status()).toBe(404);

  // The page is /404 prerendered, served at another address, nested here so a relative asset URL would break: it has to load its
  // files and hydrate there without a mismatch. The document's own 404 is the one failed response expected.
  const address = "/no/such/page";
  const errors: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).pathname !== address) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(address);
  await expect(page).toHaveTitle("Page not found · Jellycat Studio");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
  await page.getByRole("link", { name: "Go to the home page" }).click();
  await expectOs(page, info.project.name === "phone");
});
