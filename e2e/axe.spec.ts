import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// axe on whole pages, which the stories' axe never sees: before any script runs, the shell's session and the desktop's boot screen
// are both in the page (the CSS shows one), where two h1s, a landmark or an id twice would break; then the OS once it's up. Each
// test runs on both Playwright projects. The rules are WCAG 2.2 A and AA (target-size included) and axe's best practices.

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const PAGES = [
  ["the home page", "/"],
  ["a project page", "/projects/hundo"],
  ["404.html at a nested address", "/no/such/page"],
] as const;

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  // The rule and the elements it names, so a failure says what to fix.
  expect(violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`)).toEqual([]);
}

for (const [name, address] of PAGES) {
  test(`${name}, as prerendered, before the app's code loads`, async ({ page }) => {
    // The page's inline scripts run (axe needs scripts on), but none of the app's modules load, so React never hydrates and the
    // markup stays as the server rendered it, both layouts in it.
    await page.route(/\/assets\/[^/]+\.js$/, (route) => route.abort());
    await page.goto(address);
    // Only the server snapshot says "unknown": still there, React never ran.
    if (!address.startsWith("/no/")) await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", "unknown");
    await expectNoViolations(page);
  });

  test(`${name}, once the OS is up`, async ({ page }, info) => {
    await page.goto(address);
    if (address.startsWith("/no/")) await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    else await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", info.project.name === "phone" ? "shell" : "desktop");
    await expectNoViolations(page);
  });
}
