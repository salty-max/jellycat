import { expect, test } from "@playwright/test";

// The screenshot viewer (app/os/viewer): a window on the desktop, full screen in the phone's shell.
test("viewer: the shell's view steps with h and l, dims at the ends, and q returns to the prompt", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the shell is the phone's layout");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", "shell");
  const input = page.getByLabel("Terminal input");
  await page.getByRole("log", { name: "Terminal output" }).click();
  await input.pressSequentially("view lucarne");
  await input.press("Enter");
  await expect(page.getByText("view: lucarne: no screenshots")).toBeVisible();
  await input.pressSequentially("view hundo");
  await input.press("Enter");

  await expect(page.locator(".sh-pt-right")).toHaveText("1 of 3");
  const picture = page.locator(".vw-img");
  await expect(picture).toHaveAttribute("src", "/screenshots/hundo/koholint-desktop.webp");
  await expect(picture).toHaveJSProperty("complete", true);
  await expect(page.getByRole("button", { name: /h\s*prev/ })).toHaveClass(/sh-off/);
  await input.press("l");
  await expect(page.locator(".sh-pt-right")).toHaveText("2 of 3");
  await page.getByRole("button", { name: /l\s*next/ }).tap();
  await expect(page.locator(".sh-pt-right")).toHaveText("3 of 3");
  await expect(page.getByRole("button", { name: /l\s*next/ })).toHaveClass(/sh-off/);
  await expect(picture).toHaveAttribute("src", "/screenshots/hundo/koholint-phone.webp");
  await input.press("q");
  await expect(page.getByRole("log", { name: "Terminal output" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("viewer: the Info window's View opens the viewer window, the arrows step, Esc closes it", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the desktop's window");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/hundo");
  await expect(page.locator("main[data-layout]")).toHaveAttribute("data-layout", "desktop");
  const infoWindow = page.getByRole("dialog", { name: "Hundo Info" });
  await infoWindow.getByRole("button", { name: "View" }).click();

  const viewer = page.getByRole("dialog", { name: "Hundo Screenshots" });
  await expect(viewer.getByText("1 of 3")).toBeVisible();
  const picture = viewer.getByRole("img");
  await expect(picture).toHaveJSProperty("complete", true);
  await expect(viewer.getByRole("button", { name: "Previous picture" })).toBeDisabled();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("2 of 3")).toBeVisible();
  await viewer.getByRole("button", { name: "Next picture" }).click();
  await expect(viewer.getByText("3 of 3")).toBeVisible();
  await expect(viewer.getByRole("button", { name: "Next picture" })).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await expect(viewer.getByText("2 of 3")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  expect(errors).toEqual([]);
});
