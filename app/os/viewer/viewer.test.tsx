import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { projectBySlug } from "../../core/projects";
import { useWindows } from "../desktop/windows/store";
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

test("a second open of the window gives its root the focus again", () => {
  useWindows.getState().open({ id: "viewer:hundo", app: "viewer", title: "Hundo Screenshots", size: { w: 470, h: 384 } });
  const { container } = render(<ViewerWindow windowId="viewer:hundo" slug="hundo" />);
  const root = container.firstElementChild as HTMLElement;
  (document.activeElement as HTMLElement).blur();
  act(() => useWindows.getState().open({ id: "viewer:hundo", app: "viewer", title: "Hundo Screenshots", size: { w: 470, h: 384 } }));
  expect(root).toHaveFocus();
});
