import { expect, test, type Page } from "@playwright/test";
import { readmePath } from "../app/core/fs";
import { PROJECTS, projectBySlug } from "../app/core/projects";
import { STUDIO_NAME } from "../app/core/studio";

// The layout switch (app/os/layout.tsx): the shell on a phone, the desktop from 768x520, both prerendered and one picked by CSS
// until hydration. Each test runs on both Playwright projects; "phone" is a Pixel 7, "desktop" a 1280x720 window.

const DESKTOP_CHUNK = /\/assets\/desktop-[^/]+\.(js|css)$/;
const hundo = projectBySlug("hundo")!;

/** Console errors and warnings, page errors (a hydration mismatch is one) and failed responses, but the expected ones. */
function watch(page: Page, { allow = [] as string[] } = {}) {
  const problems: string[] = [];
  page.on("console", (message) => {
    if ((message.type() === "error" || message.type() === "warning") && !message.text().startsWith("Failed to load resource")) problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !allow.includes(new URL(response.url()).pathname)) problems.push(`${response.status()} ${response.url()}`);
  });
  return problems;
}

const unescape = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const layout = (page: Page) => page.locator("main[data-layout]");
const terminal = (page: Page) => page.getByRole("log", { name: "Terminal output" });

/** The OS once hydrated: the shell on a phone, the desktop (after its boot screen) on a computer. */
async function expectOs(page: Page, phone: boolean) {
  if (phone) {
    await expect(layout(page)).toHaveAttribute("data-layout", "shell");
    await expect(terminal(page)).toBeVisible();
  } else {
    await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
    await expect(page.getByRole("listbox", { name: "Desktop" })).toBeVisible();
    await expect(terminal(page)).toHaveCount(0);
  }
}

test("the phone gets the shell and never asks for the desktop's code; the desktop boots", async ({ page }, info) => {
  const phone = info.project.name === "phone";
  const chunks: string[] = [];
  page.on("request", (request) => {
    if (DESKTOP_CHUNK.test(new URL(request.url()).pathname)) chunks.push(request.url());
  });
  const problems = watch(page);
  await page.goto("/");
  if (!phone) await expect(page.getByRole("heading", { name: "Jelly-OS 1.0" })).toBeVisible();
  await expectOs(page, phone);
  await page.waitForLoadState("networkidle");
  if (phone) {
    expect(chunks).toEqual([]);
    await expect(page.getByRole("heading", { name: "Jelly-OS 1.0" })).toHaveCount(0);
  } else expect(chunks.length).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test("before any script runs, the CSS shows the shell on a phone and the boot screen on a computer", async ({ browser }, info) => {
  const phone = info.project.name === "phone";
  const context = await browser.newContext({ ...info.project.use, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/projects/${hundo.slug}`);
  await expect(layout(page)).toHaveAttribute("data-layout", "unknown");
  await expect(page.getByRole("heading", { level: 1, name: hundo.name })).toBeVisible({ visible: phone });
  await expect(page.getByRole("heading", { name: "Jelly-OS 1.0" })).toBeVisible({ visible: !phone });
  await context.close();
});

for (const [name, address, notFound] of [
  ["the home page", "/", false],
  ["a project page", `/projects/${hundo.slug}`, false],
  ["404.html at a nested address", "/no/such/page", true],
] as const) {
  test(`${name} hydrates with no console error and no mismatch`, async ({ page }, info) => {
    const problems = watch(page, { allow: notFound ? [address] : [] });
    await page.goto(address);
    if (notFound) await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    else await expectOs(page, info.project.name === "phone");
    await page.waitForLoadState("networkidle");
    expect(problems).toEqual([]);
  });
}

test("every project page prerenders its card and README: the name is the h1, the README's headings h2 and h3", async ({ request }) => {
  for (const project of PROJECTS) {
    const html = await (await request.get(`/projects/${project.slug}`)).text();
    const h1s = [...html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((match) => unescape(match[1]));
    // The boot screen's name is prerendered too, for the desktop; the CSS shows one of them.
    expect(h1s, project.slug).toEqual([project.name, "Jelly-OS 1.0"]);
    // Two commands, each at its own prompt, as typed.
    expect(html, project.slug).toContain(`guest@jellycat:~$ open ${project.slug}<`);
    expect(html, project.slug).toContain(`guest@jellycat:~$ cat ${readmePath(project)}<`);
    expect(html, project.slug).toMatch(/<h2>[^<]+<\/h2>/);
    expect(html, project.slug).toMatch(/<h3>[^<]+<\/h3>/);
  }
});

test("a project page opens on the open line, with the README already printed", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the desktop shows its own windows; the shell is the phone's");
  await page.goto(`/projects/${hundo.slug}`);
  await expect(terminal(page)).toBeVisible();
  const command = page.getByText(`guest@jellycat:~$ open ${hundo.slug}`, { exact: true });
  await expect(command).toBeInViewport();
  await expect(page.getByText("Type help for the commands")).not.toBeInViewport();
  await expect(page.getByRole("heading", { level: 1, name: hundo.name })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "How it's built" })).toBeAttached();
});

test("opening a project moves the address, and back and forward walk it without reloading the OS", async ({ page }, info) => {
  const phone = info.project.name === "phone";
  const problems = watch(page);
  await page.goto("/");
  await expectOs(page, phone);
  // The desktop opens projects from its windows (D3); in a narrow window it is the shell, which does here.
  if (!phone) await page.setViewportSize({ width: 600, height: 700 });
  await expect(terminal(page)).toBeVisible();
  await page.evaluate(() => ((window as unknown as { kept: boolean }).kept = true));

  await page.getByRole("button", { name: "open hundo" }).click();
  await expect(page).toHaveURL(`/projects/${hundo.slug}`);
  await expect(page).toHaveTitle(`${hundo.name} · ${STUDIO_NAME}`);
  await expect(terminal(page)).toContainText(hundo.description);

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle(STUDIO_NAME);
  await page.goForward();
  await expect(page).toHaveURL(`/projects/${hundo.slug}`);
  await expect(page).toHaveTitle(`${hundo.name} · ${STUDIO_NAME}`);
  // The same OS all along: the log kept the card, and the page never reloaded.
  await expect(terminal(page)).toContainText(hundo.description);
  expect(await page.evaluate(() => (window as unknown as { kept?: boolean }).kept)).toBe(true);

  // Opening the project already shown doesn't stack another history entry.
  await page.getByRole("button", { name: "open hundo" }).first().click();
  await page.goBack();
  await expect(page).toHaveURL("/");
  expect(problems).toEqual([]);
});

test("the first crossing to a wide window boots for the full 1.3s, counted from the crossing", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "one crossing is enough");
  await page.setViewportSize({ width: 600, height: 700 });
  await page.goto("/");
  await expect(layout(page)).toHaveAttribute("data-layout", "shell");
  await page.waitForTimeout(1500);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(layout(page)).toHaveAttribute("data-layout", "boot");
  const crossed = Date.now();
  await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
  expect(Date.now() - crossed).toBeGreaterThan(1000);
});

test("the not-found page never asks for the desktop's code", async ({ page }) => {
  const chunks: string[] = [];
  page.on("request", (request) => {
    if (DESKTOP_CHUNK.test(new URL(request.url()).pathname)) chunks.push(request.url());
  });
  await page.goto("/no/such/page");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(chunks).toEqual([]);
});

test("crossing the breakpoint swaps the layout", async ({ page }, info) => {
  const phone = info.project.name === "phone";
  await page.goto("/");
  await expectOs(page, phone);
  await page.setViewportSize(phone ? { width: 1024, height: 768 } : { width: 1024, height: 500 });
  await expectOs(page, !phone);
  await page.setViewportSize(info.project.use.viewport!);
  await expectOs(page, phone);
});

test("a desktop whose code fails to load falls back to the shell", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "a phone never loads the desktop");
  await page.route(DESKTOP_CHUNK, (route) => route.abort());
  await page.goto("/");
  await expect(layout(page)).toHaveAttribute("data-layout", "shell");
  await expect(terminal(page)).toBeVisible();
});
