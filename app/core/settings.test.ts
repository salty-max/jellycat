import { readFileSync } from "node:fs";
import { act } from "@testing-library/react";
import { DEFAULT_SETTINGS, HEAD_SCRIPT, SETTINGS_KEY, applySettings, rehydrateSettings, sanitize, settingsAttributes, useSettings } from "./settings";

const root = () => document.documentElement;
const save = (state: unknown) => localStorage.setItem(SETTINGS_KEY, JSON.stringify({ state, version: 1 }));

beforeEach(() => {
  localStorage.clear();
  for (const name of Object.keys(settingsAttributes(DEFAULT_SETTINGS))) root().removeAttribute(name);
});

test("the defaults are the full tube, with flicker off", () => {
  expect(DEFAULT_SETTINGS).toEqual({ phosphor: "green", scanlines: true, glow: true, flicker: false, dither: true });
  expect(useSettings.getState()).toMatchObject(DEFAULT_SETTINGS);
});

test("the store does not read storage until it is told to", async () => {
  save({ phosphor: "amber", scanlines: false, glow: true, flicker: true, dither: false });
  expect(useSettings.getState().phosphor).toBe("green");
  await act(async () => {
    await rehydrateSettings();
  });
  expect(useSettings.getState()).toMatchObject({ phosphor: "amber", scanlines: false, flicker: true, dither: false });
});

test("a change is saved", () => {
  act(() => useSettings.getState().set("phosphor", "white"));
  expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).state).toMatchObject({ phosphor: "white" });
});

test("a bad saved value falls back to its default", async () => {
  save({ phosphor: "purple", scanlines: "yes", glow: false });
  await act(async () => {
    await rehydrateSettings();
  });
  expect(useSettings.getState()).toMatchObject({ phosphor: "green", scanlines: true, glow: false });
  expect(sanitize(null)).toEqual({});
});

test("the head script sets the attributes the store would", () => {
  const saved = { phosphor: "amber", scanlines: false, glow: false, flicker: true, dither: false } as const;
  save(saved);
  new Function(HEAD_SCRIPT)();
  expect(root()).toHaveAttribute("data-phosphor", "amber");
  const expected = settingsAttributes(saved);
  for (const [name, value] of Object.entries(expected)) expect(root()).toHaveAttribute(name, value);
});

test("the head script leaves the page alone when nothing usable is saved", () => {
  new Function(HEAD_SCRIPT)();
  expect(root()).not.toHaveAttribute("data-phosphor");
  localStorage.setItem(SETTINGS_KEY, "{not json");
  expect(() => new Function(HEAD_SCRIPT)()).not.toThrow();
  save({ phosphor: "purple", glow: "x" });
  new Function(HEAD_SCRIPT)();
  expect(root()).not.toHaveAttribute("data-phosphor");
  expect(root()).not.toHaveAttribute("data-glow");
});

test("applySettings writes every attribute", () => {
  applySettings({ ...DEFAULT_SETTINGS, phosphor: "white", flicker: true });
  expect(root()).toHaveAttribute("data-phosphor", "white");
  expect(root()).toHaveAttribute("data-flicker", "true");
});

test("the head script ignores a saved version the store would drop", () => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ state: { phosphor: "amber" }, version: 2 }));
  new Function(HEAD_SCRIPT)();
  expect(root()).not.toHaveAttribute("data-phosphor");
});

// The e2e runs React's production build, which logs nothing for an attribute mismatch, so the prop is checked in the source.
test("<html> is marked to differ between the server's markup and the client's", () => {
  expect(readFileSync("app/root.tsx", "utf8")).toMatch(/<html\b[^>]*suppressHydrationWarning/);
});
