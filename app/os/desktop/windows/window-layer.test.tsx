import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import type { AppProps } from "../registry";
import { useWindows } from "./store";
import { WindowLayer } from "./window-layer";

const Note = ({ text = "note" }: AppProps & { text?: string }) => <p>{text}</p>;
const Field = () => <input aria-label="Command" autoFocus />;
const registry = { note: Note, field: Field };

const open = (app: string, title = app, props = {}) => useWindows.getState().open({ app, title, size: { w: 300, h: 200 }, props });
const win = (name: string) => screen.getByRole("dialog", { name });
const state = (id: string) => useWindows.getState().windows[id]!;

beforeEach(() => {
  render(<WindowLayer registry={registry} />);
});

describe("the layer", () => {
  it("renders each window with its app, its props and its title", async () => {
    open("note", "Readme", { text: "hello" });
    expect(await screen.findByRole("dialog", { name: "Readme" })).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
  it("says non-modal", async () => {
    open("note");
    expect(await screen.findByRole("dialog")).toHaveAttribute("aria-modal", "false");
  });
  it("marks the window in front and stacks by order", async () => {
    open("note", "One");
    useWindows.getState().open({ app: "note", id: "n2", title: "Two", size: { w: 200, h: 150 } });
    await screen.findByRole("dialog", { name: "Two" });
    expect(win("Two")).toHaveAttribute("data-active");
    expect(win("Two").style.zIndex).toBe("2");
  });
  it("skips a window whose app isn't registered", () => {
    open("ghost");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the boxes", () => {
  it("close, collapse and zoom act on their window", async () => {
    const user = userEvent.setup();
    open("note", "Readme");
    const frame = await screen.findByRole("dialog", { name: "Readme" });
    const boxes = within(frame);
    await user.click(boxes.getByRole("button", { name: "Collapse" }));
    expect(state("note").collapsed).toBe(true);
    expect(frame.style.height).toBe("24px");
    await user.click(boxes.getByRole("button", { name: "Zoom" }));
    expect(state("note")).toMatchObject({ x: 8, y: 8, collapsed: false });
    await user.click(boxes.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("a click on a window behind brings it to the front", async () => {
    const user = userEvent.setup();
    open("note", "One");
    useWindows.getState().open({ app: "note", id: "b", title: "Two", size: { w: 200, h: 150 } });
    await user.click(await screen.findByRole("dialog", { name: "One" }));
    expect(useWindows.getState().order).toEqual(["b", "note"]);
    expect(win("One")).toHaveAttribute("data-active");
    expect(win("Two")).not.toHaveAttribute("data-active");
  });
});

describe("the title bar's keys", () => {
  it("arrows move the window by 8px", async () => {
    const user = userEvent.setup();
    open("note", "Readme");
    const bar = within(await screen.findByRole("dialog", { name: "Readme" })).getByRole("group");
    bar.focus();
    const { x, y } = state("note");
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowDown}{ArrowLeft}");
    expect(state("note")).toMatchObject({ x: x + 8, y: y + 8 });
  });
  it("Shift+arrows resize it, to the minimum and no less", async () => {
    const user = userEvent.setup();
    open("note", "Readme");
    const bar = within(await screen.findByRole("dialog", { name: "Readme" })).getByRole("group");
    bar.focus();
    await user.keyboard("{Shift>}{ArrowRight}{ArrowDown}{/Shift}");
    expect(state("note")).toMatchObject({ w: 308, h: 208 });
    await user.keyboard("{Shift>}" + "{ArrowLeft}".repeat(20) + "{/Shift}");
    expect(state("note").w).toBe(220);
  });
  it("arrows in the app's own field are left to it", async () => {
    const user = userEvent.setup();
    open("field", "Terminal");
    const input = await screen.findByLabelText("Command");
    const { x } = state("field");
    await user.type(input, "{ArrowRight}");
    expect(state("field").x).toBe(x);
  });
});

describe("pointer", () => {
  it("dragging the title bar moves the window, clamped", async () => {
    open("note", "Readme");
    const bar = within(await screen.findByRole("dialog", { name: "Readme" })).getByRole("group");
    const { x, y } = state("note");
    bar.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 100, button: 0 }));
    bar.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, buttons: 1, clientX: 130, clientY: 120 }));
    expect(state("note")).toMatchObject({ x: x + 30, y: y + 20 });
    bar.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, buttons: 1, clientX: -5000, clientY: -5000 }));
    expect(state("note")).toMatchObject({ x: -240, y: 0 });
    bar.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    bar.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, buttons: 1, clientX: 100, clientY: 100 }));
    expect(state("note")).toMatchObject({ x: -240, y: 0 });
  });
  it("dragging the grip resizes it", async () => {
    open("note", "Readme");
    const frame = await screen.findByRole("dialog", { name: "Readme" });
    const grip = frame.querySelector(".window-grip")!;
    grip.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 300, clientY: 200, button: 0 }));
    grip.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, buttons: 1, clientX: 340, clientY: 230 }));
    expect(state("note")).toMatchObject({ w: 340, h: 230 });
  });
});

describe("with a window behind", () => {
  it("raising a window by its title bar keeps its DOM node, so the drag keeps its pointer", async () => {
    open("note", "One");
    useWindows.getState().open({ app: "note", id: "b", title: "Two", size: { w: 200, h: 150 } });
    const back = await screen.findByRole("dialog", { name: "One" });
    const bar = within(back).getByRole("group");
    bar.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50, button: 0 }));
    expect(useWindows.getState().order).toEqual(["b", "note"]);
    expect(screen.getByRole("dialog", { name: "One" })).toBe(back);
    expect(back.isConnected).toBe(true);
  });
  it("a move with no button held does not drag", async () => {
    open("note", "One");
    const bar = within(await screen.findByRole("dialog", { name: "One" })).getByRole("group");
    const { x } = state("note");
    bar.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50, button: 0 }));
    bar.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, buttons: 0, clientX: 90, clientY: 50 }));
    expect(state("note").x).toBe(x);
  });
  it("Tabbing into a window behind brings it to the front", async () => {
    const user = userEvent.setup();
    open("note", "One");
    useWindows.getState().open({ app: "note", id: "b", title: "Two", size: { w: 200, h: 150 } });
    await screen.findByRole("dialog", { name: "Two" });
    await user.click(within(win("One")).getByRole("group"));
    useWindows.getState().focus("b");
    within(win("One")).getByRole("button", { name: "Close" }).focus();
    expect(useWindows.getState().order.at(-1)).toBe("note");
  });
  it("closing the front window sends the focus to its opener, not into the one behind", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    open("note", "One");
    await screen.findByRole("dialog", { name: "One" });
    opener.focus();
    useWindows.getState().open({ app: "note", id: "b", title: "Two", size: { w: 200, h: 150 } });
    await screen.findByRole("dialog", { name: "Two" });
    act(() => useWindows.getState().close("b"));
    expect(opener).toHaveFocus();
    opener.remove();
  });
});

describe("focus, more", () => {
  it("a second open of an open window takes the focus in", async () => {
    open("note", "One");
    const one = await screen.findByRole("dialog", { name: "One" });
    const other = document.createElement("button");
    document.body.append(other);
    other.focus();
    act(() => void open("note", "One"));
    expect(one).toHaveFocus();
    other.remove();
  });
  it("closing a window leaves the focus alone when it is elsewhere", async () => {
    open("note", "One");
    await screen.findByRole("dialog", { name: "One" });
    const elsewhere = document.createElement("input");
    document.body.append(elsewhere);
    elsewhere.focus();
    act(() => useWindows.getState().close("note"));
    expect(elsewhere).toHaveFocus();
    elsewhere.remove();
  });
});

describe("focus", () => {
  it("goes into a window that opens, and back to the opener when it closes", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    open("note", "Readme");
    const frame = await screen.findByRole("dialog", { name: "Readme" });
    expect(frame).toHaveFocus();
    act(() => useWindows.getState().close("note"));
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it("leaves the focus where the app put it", async () => {
    open("field", "Terminal");
    expect(await screen.findByLabelText("Command")).toHaveFocus();
  });
});
