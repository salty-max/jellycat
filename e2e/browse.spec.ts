import { expect, test } from "@playwright/test";

// browse in the phone's shell (app/os/shell/browse): keys and taps, a README paged from it, and q back to the prompt.
test("browse: move, open a README and page it, q back to browse, q back to the prompt", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the shell is the phone's layout");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", "shell");
  const input = page.getByLabel("Terminal input");
  await page.getByRole("log", { name: "Terminal output" }).click();
  await input.pressSequentially("browse");
  await input.press("Enter");

  const directory = page.getByRole("group", { name: "Directory" });
  await expect(directory.locator("[aria-current=true]")).toHaveText("projects/");
  await input.press("j");
  await expect(directory.locator("[aria-current=true]")).toHaveText("contact.txt");
  await input.press("k");

  // Taps: a tap selects, a tap on the selected row opens.
  await directory.getByRole("button", { name: "projects/" }).tap();
  await expect(page.locator(".sh-panes .sh-pt").first()).toHaveText("~/projects");
  await directory.getByRole("button", { name: "web/" }).tap();
  await directory.getByRole("button", { name: "web/" }).tap();
  await directory.getByRole("button", { name: "hundo/" }).tap();
  await expect(page.getByLabel("Selection")).toContainText("Stack");
  await directory.getByRole("button", { name: "hundo/" }).tap();
  await directory.getByRole("button", { name: "README" }).tap();
  await expect(page.getByLabel("Selection").getByRole("heading", { level: 2 })).toBeVisible();

  // Enter pages the README; q there comes back to browse where it was.
  await input.press("Enter");
  await expect(page.getByRole("region", { name: "~/projects/web/hundo/README" })).toBeVisible();
  await input.press("q");
  await expect(directory.locator("[aria-current=true]")).toHaveText("README");

  await page.getByRole("button", { name: /q\s*quit/ }).tap();
  await expect(page.getByRole("log", { name: "Terminal output" })).toBeVisible();
  expect(errors).toEqual([]);
});
