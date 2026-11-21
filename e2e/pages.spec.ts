import { expect, test } from "@playwright/test";
import { FOLDERS, FOLDER_NAMES, PROJECTS } from "../app/core/projects";
import { pageUrl } from "../app/core/site";
import { STUDIO_NAME } from "../app/core/studio";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

for (const project of PROJECTS) {
  test(`/projects/${project.slug} is prerendered with its meta`, async ({ request }) => {
    const res = await request.get(`/projects/${project.slug}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    const title = escape(`${project.name} · ${STUDIO_NAME}`);
    const description = escape(project.description);
    const url = pageUrl(`/projects/${project.slug}`);
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain(`<meta name="description" content="${description}"/>`);
    expect(html).toContain(`<link rel="canonical" href="${url}"/>`);
    expect(html).toContain(`<meta property="og:title" content="${title}"/>`);
    expect(html).toContain(`<meta property="og:description" content="${description}"/>`);
    expect(html).toContain(`<meta property="og:url" content="${url}"/>`);
  });
}

test("the sitemap lists every page and robots names it", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(listed).toEqual([pageUrl("/"), ...PROJECTS.map((project) => pageUrl(`/projects/${project.slug}`))]);

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${pageUrl("/sitemap.xml")}`);
});

test("an unknown project answers 404 and the browser shows the not-found page", async ({ request, page }) => {
  expect((await request.get("/projects/no-such")).status()).toBe(404);

  const address = "/projects/no-such";
  const problems: string[] = [];
  page.on("console", (message) => {
    if ((message.type() === "error" || message.type() === "warning") && !message.text().startsWith("Failed to load resource")) problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).pathname !== address) problems.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(address);
  await expect(page).toHaveTitle(`Page not found · ${STUDIO_NAME}`);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  // Hydrated over 404.html's markup, not beside it: the root's HydrateFallback draws the same screen until the loader's 404.
  await expect(page.locator("main")).toHaveCount(1);
  expect(problems).toEqual([]);
});

// The phone's pages (app/os/phone): what a visitor on a phone reads and taps, once the page is up.
test.describe("on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone's page");
  const main = (page: import("@playwright/test").Page) => page.getByRole("main");

  test("the home page: the studio, its contact, the folders as tabs and each folder's projects as cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: STUDIO_NAME })).toBeVisible();
    await expect(main(page).getByRole("link", { name: "max@jellycat.fr" })).toHaveAttribute("href", "mailto:max@jellycat.fr");
    await expect(main(page).getByRole("link", { name: "github.com/salty-max" })).toHaveAttribute("href", "https://github.com/salty-max");
    const tabs = page.getByRole("navigation", { name: "Folders" }).getByRole("link");
    await expect(tabs).toHaveText(FOLDERS.map((folder) => `${FOLDER_NAMES[folder]} ${PROJECTS.filter((project) => project.folder === folder).length}`));
    await expect(main(page).getByRole("heading", { level: 2 })).toHaveCount(FOLDERS.length);
    // One link a card, named by the project alone.
    await expect(main(page).getByRole("listitem").getByRole("link")).toHaveText(PROJECTS.map((project) => project.name));
    await expect(page.getByRole("contentinfo")).toHaveText("Jelly-OS 1.0");
  });

  test("every project page: the name, the facts and the README's headings", async ({ page }) => {
    await page.goto("/");
    for (const project of PROJECTS) {
      await page.goto(`/projects/${project.slug}`);
      await expect(page.getByRole("heading", { level: 1, name: project.name, exact: true })).toBeVisible();
      await expect(main(page).locator("dt")).toHaveText(["Stack", "Link", "Source"]);
      await expect(main(page).locator("dd").first()).toHaveText(project.stack);
      const readme = page.getByRole("region", { name: "README" });
      await expect(readme.getByRole("heading", { level: 2 })).toHaveText(project.name);
      expect(await readme.getByRole("heading", { level: 3 }).count(), project.slug).toBeGreaterThan(0);
    }
  });

  test("a card opens its page; the back link, Previous and Next move as links do", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Farseer", exact: true }).click();
    await expect(page).toHaveURL("/projects/farseer");
    await expect(page.getByRole("heading", { level: 1, name: "Farseer" })).toBeVisible();
    const neighbours = page.getByRole("navigation", { name: "Projects" });
    await neighbours.getByRole("link", { name: /Next/ }).click();
    await expect(page).toHaveURL("/projects/lucarne");
    // A new page starts at its top.
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await neighbours.getByRole("link", { name: /Previous/ }).click();
    await expect(page).toHaveURL("/projects/farseer");
    await page.getByRole("link", { name: "Web", exact: true }).click();
    await expect(page).toHaveURL("/#web");
    await expect(page.getByRole("heading", { level: 2, name: /^Web/ })).toBeInViewport();
  });

  test("a folder tab jumps to its folder, and back returns to the top", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Folders" }).getByRole("link", { name: /Tools/ }).click();
    await expect(page).toHaveURL("/#tools");
    await expect(page.getByRole("heading", { level: 2, name: /^Tools/ })).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("the header and a folder's bar stay at the top while the page scrolls", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByRole("heading", { level: 2, name: /^Addons/ });
    const top = (await bar.boundingBox())!.y + (await page.evaluate(() => window.scrollY));
    await page.evaluate((y) => window.scrollTo(0, y + 600), top);
    await expect.poll(async () => (await page.getByRole("banner").boundingBox())?.y).toBe(0);
    expect((await bar.boundingBox())!.y).toBe(44);
  });

  test("a README's link to another project moves to its page", async ({ page }) => {
    await page.goto("/projects/hundo");
    await page.getByRole("region", { name: "README" }).getByRole("link", { name: "harness" }).click();
    await expect(page).toHaveURL("/projects/harness");
    await expect(page.getByRole("heading", { level: 1, name: "harness" })).toBeVisible();
  });
});
