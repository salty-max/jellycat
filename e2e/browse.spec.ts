import { expect, test } from "@playwright/test";

// browse in the desktop's Terminal (app/os/shell/browse): keys and clicks, a README paged from it, and q back to the prompt.
test("browse: move, open a README and page it, q back to browse, q back to the prompt", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the shell is the desktop's Terminal");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
  await page.getByRole("option", { name: "Terminal" }).dblclick();
  const terminal = page.getByRole("dialog", { name: "Terminal" });
  const input = terminal.getByLabel("Terminal input");
  await input.pressSequentially("browse");
  await input.press("Enter");

  const directory = terminal.getByRole("group", { name: "Directory" });
  await expect(directory.locator("[aria-current=true]")).toHaveText("projects/");
  await input.press("j");
  await expect(directory.locator("[aria-current=true]")).toHaveText("contact.txt");
  await input.press("k");

  // Clicks: a click selects, a click on the selected row opens.
  await directory.getByRole("button", { name: "projects/" }).click();
  await expect(terminal.locator(".sh-panes .sh-pt").first()).toHaveText("~/projects");
  await directory.getByRole("button", { name: "web/" }).click();
  await directory.getByRole("button", { name: "web/" }).click();
  await directory.getByRole("button", { name: "hundo/" }).click();
  await expect(terminal.getByLabel("Selection")).toContainText("Stack");
  await directory.getByRole("button", { name: "hundo/" }).click();
  await directory.getByRole("button", { name: "README" }).click();
  await expect(terminal.getByLabel("Selection").getByRole("heading", { level: 2 })).toBeVisible();

  // Enter pages the README; q there comes back to browse where it was.
  await input.press("Enter");
  await expect(terminal.getByRole("region", { name: "~/projects/web/hundo/README" })).toBeVisible();
  await input.press("q");
  await expect(directory.locator("[aria-current=true]")).toHaveText("README");

  await terminal.getByRole("button", { name: /q\s*quit/ }).click();
  await expect(terminal.getByRole("log", { name: "Terminal output" })).toBeVisible();
  expect(errors).toEqual([]);
});
