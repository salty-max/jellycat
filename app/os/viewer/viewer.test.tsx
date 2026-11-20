import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { projectBySlug } from "../../core/projects";
import { useWindows } from "../desktop/windows/store";
import type { FullScreenApi } from "../shell/full-screen";
import { Shell } from "../shell/shell";
import { browseView } from "../shell/browse/slot";
import { ViewerView } from "./viewer-view";
import { ViewerWindow } from "./viewer-window";

const hundo = projectBySlug("hundo")!.screenshots;

beforeEach(() => {
  useWindows.setState(useWindows.getInitialState(), true);
});

test("the window shows the count in its info line, the picture in AVIF and WebP with its size, and the alt text as the caption", () => {
  render(<ViewerWindow windowId="viewer:hundo" slug="hundo" />);
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  const img = screen.getByRole("img", { name: hundo[0].alt });
  expect(img).toHaveAttribute("src", `${hundo[0].src}.webp`);
  expect(img).toHaveAttribute("width", String(hundo[0].width));
  expect(img).toHaveAttribute("height", String(hundo[0].height));
  expect(img).toHaveAttribute("loading", "lazy");
  expect(img.previousElementSibling).toHaveAttribute("srcset", `${hundo[0].src}.avif`);
});

test("the window steps with the buttons and the arrows, dim and inert at the ends", async () => {
  const user = userEvent.setup();
  render(<ViewerWindow windowId="viewer:hundo" slug="hundo" />);
  const previous = screen.getByRole("button", { name: "Previous picture" });
  const next = screen.getByRole("button", { name: "Next picture" });
  expect(previous).toBeDisabled();
  await user.click(next);
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  expect(next).toBeDisabled();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  expect(screen.getByRole("img")).toHaveAttribute("src", `${hundo[0].src}.webp`);
});

test("Esc closes the window", async () => {
  useWindows.getState().open({ id: "viewer:hundo", app: "viewer", title: "Hundo Screenshots", size: { w: 470, h: 384 } });
  render(<ViewerWindow windowId="viewer:hundo" slug="hundo" />);
  await userEvent.keyboard("{Escape}");
  expect(useWindows.getState().windows["viewer:hundo"]).toBeUndefined();
});

test("a project with no pictures draws nothing", () => {
  const { container } = render(<ViewerWindow windowId="viewer:lucarne" slug="lucarne" />);
  expect(container).toBeEmptyDOMElement();
});

function mount() {
  let handler: ((key: string) => boolean) | undefined;
  const close = vi.fn();
  const api: FullScreenApi = {
    close,
    page: () => {},
    setPath: () => {},
    onKey: (each) => {
      handler = each;
      return () => {};
    },
  };
  render(<ViewerView api={api} slug="hundo" />);
  return { close, press: (key: string) => handler!(key) };
}

test("full screen: the name and the count are set in the border, the caption sits under the picture", () => {
  mount();
  expect(screen.getByText("Hundo")).toHaveClass("sh-pt");
  expect(screen.getByText("1 of 3")).toHaveClass("sh-pt-right");
  expect(screen.getByText(hundo[0].alt, { selector: ".vw-vcap" })).toBeInTheDocument();
});

test("full screen: l and h (and the arrows) step, dim at the ends, and q or Esc close", async () => {
  const { close, press } = mount();
  const keyBar = (name: RegExp) => screen.getByRole("button", { name });
  expect(keyBar(/prev/)).toHaveClass("sh-off");
  expect(keyBar(/next/)).not.toHaveClass("sh-off");
  expect(press("h")).toBe(true);
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  await userEvent.click(keyBar(/next/));
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
  press("ArrowRight");
  await screen.findByText("3 of 3");
  expect(keyBar(/next/)).toHaveClass("sh-off");
  press("l");
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  press("h");
  await screen.findByText("2 of 3");
  expect(press("x")).toBe(false);
  press("q");
  press("Escape");
  expect(close).toHaveBeenCalledTimes(2);
});

test("in the shell, view opens the viewer and q returns to the prompt; a project with no pictures prints a message", async () => {
  const user = userEvent.setup();
  render(<Shell fullScreen={browseView} />);
  const input = screen.getByLabelText("Terminal input");
  await user.click(input);
  await user.type(input, "view lucarne{Enter}");
  expect(within(screen.getByRole("log")).getByText("view: lucarne: no screenshots")).toBeInTheDocument();
  await user.type(input, "view hundo{Enter}");
  expect(screen.getByText(/^\[jellycat\] 0:view\*$/)).toBeInTheDocument();
  await user.keyboard("l");
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
  await user.keyboard("q");
  expect(screen.getByRole("log")).toBeVisible();
});

test("a second open of the window gives its root the focus again", () => {
  useWindows.getState().open({ id: "viewer:hundo", app: "viewer", title: "Hundo Screenshots", size: { w: 470, h: 384 } });
  const { container } = render(<ViewerWindow windowId="viewer:hundo" slug="hundo" />);
  const root = container.firstElementChild as HTMLElement;
  (document.activeElement as HTMLElement).blur();
  act(() => useWindows.getState().open({ id: "viewer:hundo", app: "viewer", title: "Hundo Screenshots", size: { w: 470, h: 384 } }));
  expect(root).toHaveFocus();
});
