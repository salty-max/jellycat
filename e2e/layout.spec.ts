import { expect, test, type Page } from "@playwright/test";
import { FOLDERS, FOLDER_NAMES, PROJECTS, projectBySlug } from "../app/core/projects";
import { STUDIO_NAME } from "../app/core/studio";
import { itemCount } from "../app/os/phone/text";

// The layout switch (app/os/layout.tsx): the phone's page on a phone, the desktop from 768x520, both prerendered and one picked by
// CSS until hydration. Each test runs on both Playwright projects; "phone" is a Pixel 7, "desktop" a 1280x720 window.

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
const tags = (html: string, tag: string) => [...html.matchAll(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "g"))].map((match) => unescape(match[1].replace(/<[^>]+>/g, "")));
const layout = (page: Page) => page.locator("[data-layout]");
const phonePage = (page: Page) => page.locator("[data-os=phone]");
const bootName = (page: Page) => page.getByRole("heading", { name: "Jelly-OS 1.0" });

/** The OS once hydrated: the phone's page on a phone, the desktop (after its boot screen) on a computer. */
async function expectOs(page: Page, phone: boolean) {
  if (phone) {
    await expect(layout(page)).toHaveAttribute("data-layout", "phone");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("listbox", { name: "Desktop" })).toHaveCount(0);
  } else {
    await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
    await expect(page.getByRole("listbox", { name: "Desktop" })).toBeVisible();
    await expect(phonePage(page)).toHaveCount(0);
  }
}

test("the phone gets its page and never asks for the desktop's code or the shell's; the desktop boots", async ({ page }, info) => {
  const phone = info.project.name === "phone";
  const chunks: string[] = [];
  const scripts: Promise<string>[] = [];
  page.on("request", (request) => {
    if (DESKTOP_CHUNK.test(new URL(request.url()).pathname)) chunks.push(request.url());
  });
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") scripts.push(response.text().catch(() => ""));
  });
  const problems = watch(page);
  await page.goto("/");
  if (!phone) await expect(bootName(page)).toBeVisible();
  await expectOs(page, phone);
  await page.waitForLoadState("networkidle");
  if (phone) {
    expect(chunks).toEqual([]);
    // The boot screen's wrapper went with hydration, and the shell's markup was never there, nor its code in any script fetched (the
    // input's label and an error of its own are in the shell's code alone).
    await expect(bootName(page)).toHaveCount(0);
    await expect(page.locator(".sh")).toHaveCount(0);
    const code = await Promise.all(scripts);
    expect(code.length).toBeGreaterThan(0);
    expect(code.filter((text) => text.includes("Terminal input") || text.includes("command not found"))).toEqual([]);
  } else expect(chunks.length).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});

test("before the app's code runs, the CSS shows the phone's page on a phone and the boot screen on a computer", async ({ page }, info) => {
  const phone = info.project.name === "phone";
  // The page's inline scripts run, but none of the app's modules load: the markup stays as the server rendered it.
  await page.route(/\/assets\/[^/]+\.js$/, (route) => route.abort());
  await page.goto(`/projects/${hundo.slug}`);
  await expect(layout(page)).toHaveAttribute("data-layout", "unknown");
  await expect(page.getByRole("heading", { level: 1, name: hundo.name })).toBeVisible({ visible: phone });
  await expect(bootName(page)).toBeVisible({ visible: !phone });
  // The page is one screen on a computer from the first paint, so the desktop replaces the boot screen without a shift; on a phone
  // it is as tall as its content, and its background is the tube's.
  const { height, scroll, background, tube } = await page.evaluate(() => ({
    height: document.querySelector("[data-layout]")!.getBoundingClientRect().height,
    scroll: document.documentElement.scrollHeight,
    background: getComputedStyle(document.body).backgroundColor,
    tube: getComputedStyle(document.documentElement).getPropertyValue("--phosphor-bg").trim(),
  }));
  const viewport = page.viewportSize()!;
  if (phone) {
    expect(scroll).toBeGreaterThan(viewport.height * 2);
    expect(background).toBe("rgb(3, 18, 8)");
    expect(tube).toBe("#031208");
  } else {
    expect(height).toBe(viewport.height);
    expect(scroll).toBe(viewport.height);
    expect(background).toBe("rgb(0, 0, 0)");
  }
});

test("without JavaScript, every screen shows the phone's page, a computer's centred", async ({ browser }, info) => {
  const context = await browser.newContext({ ...info.project.use, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/projects/${hundo.slug}`);
  await expect(layout(page)).toHaveAttribute("data-layout", "unknown");
  await expect(page.getByRole("heading", { level: 1, name: hundo.name })).toBeVisible();
  await expect(bootName(page)).toBeHidden();
  const column = await page.locator(".ph-pj").boundingBox();
  const viewport = page.viewportSize()!;
  expect(column!.width).toBeLessThanOrEqual(640);
  expect(Math.abs(column!.x * 2 + column!.width - viewport.width)).toBeLessThanOrEqual(1);
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

test("the home page prerenders the studio, a heading per folder and a link to every project", async ({ request }) => {
  const html = await (await request.get("/")).text();
  // The boot screen's name is prerendered too, for the desktop; the CSS shows one of them.
  expect(tags(html, "h1")).toEqual([STUDIO_NAME, "Jelly-OS 1.0"]);
  expect(tags(html, "h2")).toEqual(FOLDERS.map((folder) => `${FOLDER_NAMES[folder]}${itemCount(PROJECTS.filter((project) => project.folder === folder).length)}`));
  for (const project of PROJECTS) expect(html, project.slug).toContain(`href="/projects/${project.slug}"`);
  // The shell's session isn't in the page any more.
  expect(html).not.toContain("Type help for the commands");
});

test("every project page prerenders its page: the name is the h1, its facts a list, the README's headings h2 and h3", async ({ request }) => {
  for (const project of PROJECTS) {
    const html = await (await request.get(`/projects/${project.slug}`)).text();
    expect(tags(html, "h1"), project.slug).toEqual([project.name, "Jelly-OS 1.0"]);
    expect(tags(html, "dt"), project.slug).toEqual(["Stack", "Link", "Source"]);
    // The README's own title, as an h2, and its headings, as h3s.
    expect(tags(html, "h2"), project.slug).toContain(project.name);
    expect(html, project.slug).toMatch(/<h3>[^<]+<\/h3>/);
    expect(html, project.slug).not.toContain("guest@jellycat:~$");
  }
});

test("moving between pages changes the address, and back and forward walk them without reloading the OS", async ({ page }, info) => {
  const phone = info.project.name === "phone";
  const problems = watch(page);
  await page.goto("/");
  await expectOs(page, phone);
  // The desktop opens projects from its windows; in a narrow window it is the phone's page.
  if (!phone) {
    await page.setViewportSize({ width: 600, height: 700 });
    await expectOs(page, true);
  }
  await page.evaluate(() => ((window as unknown as { kept: boolean }).kept = true));

  await page.getByRole("link", { name: hundo.name, exact: true }).click();
  await expect(page).toHaveURL(`/projects/${hundo.slug}`);
  await expect(page).toHaveTitle(`${hundo.name} · ${STUDIO_NAME}`);
  await expect(page.getByRole("heading", { level: 1, name: hundo.name })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle(STUDIO_NAME);
  await expect(page.getByRole("heading", { level: 1, name: STUDIO_NAME })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(`/projects/${hundo.slug}`);
  await expect(page).toHaveTitle(`${hundo.name} · ${STUDIO_NAME}`);
  // The same OS all along: the page never reloaded.
  expect(await page.evaluate(() => (window as unknown as { kept?: boolean }).kept)).toBe(true);
  expect(problems).toEqual([]);
});

test("the first crossing to a wide window boots for the full 1.3s, counted from the crossing", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "one crossing is enough");
  await page.setViewportSize({ width: 600, height: 700 });
  await page.goto("/");
  await expect(layout(page)).toHaveAttribute("data-layout", "phone");
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

test("while the Terminal is typed in, the layout holds through a window under 520px tall, and swaps after the blur", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "the hold is for a tablet's desktop, whose browser shrinks the page for its keyboard");
  await page.goto("/");
  await expectOs(page, false);
  await page.getByRole("dialog", { name: "Projects" }).getByRole("option", { name: "Web" }).dblclick();
  await page.getByRole("dialog", { name: "Web" }).getByRole("option", { name: /Hundo/ }).dblclick();
  await expect(page).toHaveURL(`/projects/${hundo.slug}`);
  await page.getByRole("option", { name: "Terminal" }).dblclick();
  const input = page.getByRole("dialog", { name: "Terminal" }).getByLabel("Terminal input");
  await expect(input).toBeFocused();
  // An on-screen keyboard comes up: the page shrinks under the breakpoint.
  await page.setViewportSize({ width: 1024, height: 400 });
  await input.fill("ls");
  await input.press("Enter");
  await page.waitForTimeout(1200);
  await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
  // A render of the layout while typing (back changes the address, and the Info window closes) reads the snapshot again: it holds.
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("dialog", { name: "Hundo Info" })).toHaveCount(0);
  await expect(input).toBeFocused();
  await page.waitForTimeout(300);
  await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
  // The blur: the keyboard goes, and once the hold is over the size it left takes over.
  await input.blur();
  await page.waitForTimeout(500);
  await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
  await expect(layout(page)).toHaveAttribute("data-layout", "phone");
});

test("a keyboard that goes after the blur swaps nothing: the page grows back within the hold", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "the hold is for a tablet's desktop");
  await page.goto("/");
  await expectOs(page, false);
  await page.getByRole("option", { name: "Terminal" }).dblclick();
  const input = page.getByRole("dialog", { name: "Terminal" }).getByLabel("Terminal input");
  await expect(input).toBeFocused();
  await page.setViewportSize({ width: 1024, height: 400 });
  await page.waitForTimeout(300);
  // The blur, then the keyboard's way down: the page is its full height again a moment later.
  await input.blur();
  await page.waitForTimeout(250);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(1500);
  await expect(layout(page)).toHaveAttribute("data-layout", "desktop");
  await expect(page.getByRole("dialog", { name: "Terminal" })).toBeVisible();
});

test("a desktop whose code fails to load falls back to the phone's page", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "a phone never loads the desktop");
  await page.route(DESKTOP_CHUNK, (route) => route.abort());
  await page.goto("/");
  await expect(layout(page)).toHaveAttribute("data-layout", "phone");
  await expect(page.getByRole("heading", { level: 1, name: STUDIO_NAME })).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(3, 18, 8)");
});
