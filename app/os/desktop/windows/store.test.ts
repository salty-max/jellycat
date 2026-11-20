import { beforeEach, describe, expect, it } from "vitest";

import { selectActive, useWindows } from "./store";

const size = { w: 300, h: 200 };
const open = (app: string, extra = {}) => useWindows.getState().open({ app, title: app, size, ...extra });
const get = () => useWindows.getState();

beforeEach(() => get().setDesk({ w: 652, h: 456 }));

describe("open", () => {
  it("opens a window in front, cascaded", () => {
    open("a");
    open("b");
    expect(get().order).toEqual(["a", "b"]);
    expect(selectActive(get())).toBe("b");
    expect(get().windows.a).toMatchObject({ x: 16, y: 10, w: 300, h: 200 });
    expect(get().windows.b).toMatchObject({ x: 42, y: 34 });
  });
  it("focuses a window that is already open instead of opening a second", () => {
    open("a");
    open("b");
    open("a");
    expect(get().order).toEqual(["b", "a"]);
    expect(Object.keys(get().windows)).toHaveLength(2);
  });
  it("takes an id apart from the app, so one app can have several windows", () => {
    open("info", { id: "info:one" });
    open("info", { id: "info:two" });
    expect(get().order).toEqual(["info:one", "info:two"]);
  });
  it("steps from the windows open now, so a closed window's place is used again", () => {
    open("a");
    open("b");
    get().close("b");
    open("c");
    expect(get().windows.c).toMatchObject({ x: 42, y: 34 });
  });
  it("never lands exactly on an open window", () => {
    open("a");
    open("b");
    open("c");
    get().close("a");
    open("d");
    expect(get().windows.d).toMatchObject({ x: 16, y: 10 });
    expect(get().windows.d).not.toMatchObject({ x: get().windows.c!.x, y: get().windows.c!.y });
  });
  it("numbers windows by opening order, whatever their stacking", () => {
    open("a");
    open("b");
    get().focus("a");
    expect(get().windows.a!.seq).toBeLessThan(get().windows.b!.seq);
  });
  it("can centre", () => {
    open("a", { center: true });
    expect(get().windows.a).toMatchObject({ x: 176, y: 102 });
  });
});

describe("focus and close", () => {
  it("brings a window to the front and keeps the others' order", () => {
    open("a");
    open("b");
    open("c");
    get().focus("a");
    expect(get().order).toEqual(["b", "c", "a"]);
  });
  it("ignores a window that isn't there", () => {
    open("a");
    get().focus("nope");
    get().close("nope");
    expect(get().order).toEqual(["a"]);
  });
  it("gives the front to the window behind when the front one closes", () => {
    open("a");
    open("b");
    get().close("b");
    expect(selectActive(get())).toBe("a");
    get().close("a");
    expect(selectActive(get())).toBeNull();
  });
});

describe("collapse and zoom", () => {
  it("toggles collapse", () => {
    open("a");
    get().toggleCollapse("a");
    expect(get().windows.a?.collapsed).toBe(true);
    get().toggleCollapse("a");
    expect(get().windows.a?.collapsed).toBe(false);
  });
  it("zooms to the desktop less the icon column and puts the window back on a second zoom", () => {
    open("a");
    get().toggleZoom("a");
    expect(get().windows.a).toMatchObject({ x: 8, y: 8, w: 540, h: 440 });
    get().toggleZoom("a");
    expect(get().windows.a).toMatchObject({ x: 16, y: 10, w: 300, h: 200, restore: null });
  });
  it("unfolds a collapsed window when it zooms", () => {
    open("a");
    get().toggleCollapse("a");
    get().toggleZoom("a");
    expect(get().windows.a?.collapsed).toBe(false);
  });
});

describe("move and resize", () => {
  it("clamps a move like the mockup", () => {
    open("a");
    get().moveTo("a", -1000, -1000);
    expect(get().windows.a).toMatchObject({ x: -240, y: 0 });
    get().moveTo("a", 5000, 5000);
    expect(get().windows.a).toMatchObject({ x: 592, y: 434 });
  });
  it("moves by a step", () => {
    open("a");
    get().moveBy("a", 8, -8);
    expect(get().windows.a).toMatchObject({ x: 24, y: 2 });
  });
  it("resizes down to the minimum and no smaller", () => {
    open("a");
    get().resizeTo("a", 10, 10);
    expect(get().windows.a).toMatchObject({ w: 220, h: 120 });
    get().resizeBy("a", 8, 8);
    expect(get().windows.a).toMatchObject({ w: 228, h: 128 });
  });
});

it("pulls windows back in when the desktop shrinks", () => {
  open("a", { center: true });
  get().moveTo("a", 300, 300);
  get().setDesk({ w: 400, h: 200 });
  expect(get().windows.a).toMatchObject({ x: 300, y: 178 });
  get().setDesk({ w: 200, h: 200 });
  expect(get().windows.a?.x).toBe(140);
});

it("clamps the zoom restore rect too", () => {
  open("a");
  get().moveTo("a", 300, 300);
  get().toggleZoom("a");
  get().setDesk({ w: 400, h: 200 });
  expect(get().windows.a?.restore).toMatchObject({ y: 178 });
});

it("follows the desktop's size", () => {
  get().setDesk({ w: 400, h: 300 });
  open("a");
  get().toggleZoom("a");
  expect(get().windows.a).toMatchObject({ w: 400 - 104 - 8, h: 284 });
});
