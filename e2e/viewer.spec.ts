import { expect, test, type Page } from "@playwright/test";

// The screenshot viewer: a window on the desktop (app/os/viewer), a modal dialog on the phone (app/os/phone/viewer-dialog.tsx).
const shotCount = (page: Page) => page.getByRole("dialog", { name: "Hundo screenshots" }).getByRole("status");

test("viewer: a picture opens the phone's dialog at it; the buttons, the arrows and a swipe step; Esc and Close give the focus back", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the phone's dialog");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/hundo");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "phone");
  const pictures = page.getByRole("region", { name: /Screenshots/ }).getByRole("button");
  await expect(pictures).toHaveCount(3);

  await pictures.nth(1).tap();
  const viewer = page.getByRole("dialog", { name: "Hundo screenshots" });
  await expect(shotCount(page)).toHaveText("2 of 3");
  await expect(viewer.getByRole("img")).toHaveJSProperty("complete", true);
  // The page behind is inert and doesn't scroll; the dialog carries its own CRT layer, and the page's is hidden under it.
  await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
  await expect(viewer.locator(".crt-overlay")).toBeAttached();
  await expect(page.locator(".ph-crt.crt-overlay")).toBeHidden();
  await expect(viewer.getByRole("button", { name: "Close" })).toBeFocused();

  await viewer.getByRole("button", { name: "Next" }).tap();
  await expect(shotCount(page)).toHaveText("3 of 3");
  await expect(viewer.getByRole("button", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(shotCount(page)).toHaveText("2 of 3");
  await viewer.getByRole("button", { name: "Previous" }).tap();
  await expect(shotCount(page)).toHaveText("1 of 3");
  await expect(viewer.getByRole("button", { name: "Previous" })).toHaveAttribute("aria-disabled", "true");

  // A swipe to the left: the next picture.
  const box = (await viewer.locator(".dlg-box").boundingBox())!;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await touch("touchStart", box.x + box.width * 0.8);
  for (const at of [0.65, 0.5, 0.35, 0.2]) await touch("touchMove", box.x + box.width * at);
  await touch("touchEnd", 0);
  await expect(shotCount(page)).toHaveText("2 of 3");

  // Esc, the real key: the browser closes the dialog (Android's back gesture goes the same way, through its close watcher).
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(pictures.nth(1)).toBeFocused();
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  await expect(page.locator(".ph-crt.crt-overlay")).toBeVisible();

  await pictures.nth(2).tap();
  await expect(shotCount(page)).toHaveText("3 of 3");
  await viewer.getByRole("button", { name: "Close" }).tap();
  await expect(viewer).toHaveCount(0);
  await expect(pictures.nth(2)).toBeFocused();
  expect(errors).toEqual([]);
});

test("viewer: back in the browser with the viewer open leaves the page, and the next page scrolls", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "the phone's dialog");
  await page.goto("/");
  await page.getByRole("link", { name: "Hundo", exact: true }).tap();
  await expect(page).toHaveURL("/projects/hundo");
  await page.getByRole("region", { name: /Screenshots/ }).getByRole("button").first().tap();
  await expect(page.getByRole("dialog", { name: "Hundo screenshots" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
});

test("viewer: the Info window's View opens the viewer window, the arrows step, Esc closes it", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the desktop's window");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/projects/hundo");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "desktop");
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
