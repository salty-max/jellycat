import { expect, test } from "@playwright/test";
import { PROJECTS } from "../app/core/projects";
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
  expect(problems).toEqual([]);
});
