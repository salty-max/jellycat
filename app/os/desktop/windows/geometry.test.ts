import { describe, expect, it } from "vitest";

import { cascade, centered, clampPosition, clampSize, zoomRect } from "./geometry";

const desk = { w: 652, h: 456 };

describe("clampPosition", () => {
  it("keeps 60px of the window in view across and the title bar on the desktop", () => {
    expect(clampPosition(-1000, -50, 300, desk)).toEqual({ x: -240, y: 0 });
    expect(clampPosition(1000, 1000, 300, desk)).toEqual({ x: 592, y: 434 });
  });
  it("leaves a position inside alone", () => {
    expect(clampPosition(40, 30, 300, desk)).toEqual({ x: 40, y: 30 });
  });
});

describe("clampSize", () => {
  it("has a minimum of 220×120 and no maximum", () => {
    expect(clampSize(10, 10)).toEqual({ w: 220, h: 120 });
    expect(clampSize(5000, 4000)).toEqual({ w: 5000, h: 4000 });
  });
});

describe("cascade", () => {
  it("steps 26px right and 24px down", () => {
    expect(cascade(0, { w: 300, h: 200 }, desk)).toEqual({ x: 16, y: 10 });
    expect(cascade(2, { w: 300, h: 200 }, desk)).toEqual({ x: 68, y: 58 });
  });
  it("stays clear of the icon column and the bottom edge", () => {
    expect(cascade(50, { w: 300, h: 200 }, desk)).toEqual({ x: 652 - 300 - 104, y: 456 - 200 - 8 });
  });
  it("never goes under the 8px margin", () => {
    expect(cascade(0, { w: 640, h: 450 }, desk)).toEqual({ x: 8, y: 8 });
  });
});

it("centres a dialog, a little above the middle", () => {
  expect(centered({ w: 320, h: 140 }, desk)).toEqual({ x: 166, y: 126 });
});

it("zoom fills the desktop less the icon column and an 8px margin", () => {
  expect(zoomRect(desk)).toEqual({ x: 8, y: 8, w: 540, h: 440 });
});
