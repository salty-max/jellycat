import { expect, test } from "@playwright/test";

test("the home page is prerendered HTML", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain("<title>Jellycat Studio</title>");
  expect(html).toContain("Jelly-OS 1.0");
});

test("the home page boots in the browser", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Jellycat Studio");
  await expect(page.getByRole("heading", { name: "Jelly-OS 1.0" })).toBeVisible();
});

test("an unknown address answers 404 with the not-found page", async ({ request, page }) => {
  const res = await request.get("/no-such-page");
  expect(res.status()).toBe(404);
  expect(await res.text()).toContain("There&#x27;s no page at this address.");
  expect((await request.get("/assets/no-such-chunk.js")).status()).toBe(404);

  // The page is /404 prerendered, served at another address: it has to hydrate there without a mismatch. The document's own 404 is
  // the one console error expected.
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/no-such-page");
  await expect(page).toHaveTitle("Page not found · Jellycat Studio");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
  await page.getByRole("link", { name: "Go to the home page" }).click();
  await expect(page.getByRole("heading", { name: "Jelly-OS 1.0" })).toBeVisible();
});
