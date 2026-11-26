import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CUES, CUE_NAMES } from "./cues";
import { installFakeAudio } from "./fake-audio";

// The module keeps the engine it loaded, so each test starts from a fresh copy of the sound code and of the settings it reads.
async function fresh() {
  vi.resetModules();
  const settings = await import("../../core/settings");
  const sound = await import("./sound");
  function Gesture() {
    sound.useSoundGesture();
    return null;
  }
  return { settings, sound, Gesture };
}
/** The chunk loads on a later tick. */
const loaded = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

let audio: ReturnType<typeof installFakeAudio>;
beforeEach(() => void (audio = installFakeAudio()));
afterEach(() => audio.restore());

describe("a page that never gets a click or a key", () => {
  test("makes no audio context at load, with sound off or saved on", async () => {
    const { settings, Gesture } = await fresh();
    const view = render(<Gesture />);
    await loaded();
    expect(audio.contexts).toHaveLength(0);
    act(() => settings.useSettings.setState({ sound: true }));
    await loaded();
    expect(audio.contexts).toHaveLength(0);
    view.unmount();
  });

  test("plays nothing, even with sound on, and a window opening by itself makes no context", async () => {
    const { settings, sound, Gesture } = await fresh();
    settings.useSettings.setState({ sound: true });
    render(<Gesture />);
    await loaded();
    for (const cue of CUE_NAMES) sound.playCue(cue);
    await loaded();
    expect(audio.contexts).toHaveLength(0);
    expect(audio.played).toHaveLength(0);
  });
});

describe("with sound off", () => {
  test("nothing is made and nothing plays, whatever is asked", async () => {
    const { sound, Gesture } = await fresh();
    render(<Gesture />);
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    for (const cue of CUE_NAMES) sound.playCue(cue);
    await loaded();
    expect(audio.contexts).toHaveLength(0);
    expect(audio.played).toHaveLength(0);
  });
});

describe("with sound saved on", () => {
  test("the first click makes the one context, ambient, and runs it; the next clicks and keys make no other", async () => {
    const { settings, Gesture } = await fresh();
    settings.useSettings.setState({ sound: true });
    render(<Gesture />);
    await loaded();
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    expect(audio.contexts[0]!.state).toBe("suspended");
    await loaded();
    expect(audio.contexts).toHaveLength(1);
    expect(audio.contexts[0]!.state).toBe("running");
    expect(audio.session.type).toBe("ambient");
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a" }));
    expect(audio.contexts).toHaveLength(1);
  });

  test("a finger going down, which may be a scroll, and Escape are no gesture: the context waits for a real one", async () => {
    const { settings, Gesture } = await fresh();
    settings.useSettings.setState({ sound: true });
    render(<Gesture />);
    await loaded();
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
    document.body.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerType: "touch" }));
    document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(audio.contexts).toHaveLength(0);
    document.body.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" }));
    expect(audio.contexts).toHaveLength(1);
  });

  test("a key is a gesture too", async () => {
    const { settings, Gesture } = await fresh();
    settings.useSettings.setState({ sound: true });
    render(<Gesture />);
    await loaded();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Tab" }));
    expect(audio.contexts).toHaveLength(1);
  });

  test("each cue schedules its notes once the context runs", async () => {
    const { settings, sound, Gesture } = await fresh();
    settings.useSettings.setState({ sound: true });
    render(<Gesture />);
    await loaded();
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    await loaded();
    for (const cue of CUE_NAMES) {
      audio.played.length = 0;
      sound.playCue(cue);
      expect(audio.played.map((note) => note.freq)).toEqual(CUES[cue].map((note) => note.freq));
    }
    expect(audio.contexts).toHaveLength(1);
  });

  test("a cue asked for in the click that wakes the context waits for it to run, then plays once", async () => {
    const { settings, sound, Gesture } = await fresh();
    settings.useSettings.setState({ sound: true });
    render(<Gesture />);
    await loaded();
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    // The context is made and resuming, not yet running: the cue is held until the resume settles.
    sound.playCue("open");
    expect(audio.contexts[0]!.state).toBe("suspended");
    expect(audio.played).toHaveLength(0);
    await loaded();
    expect(audio.played.map((note) => note.freq)).toEqual(CUES.open.map((note) => note.freq));
  });

  test("turning it off while the first resume is still settling still ends suspended", async () => {
    const { settings, sound, Gesture } = await fresh();
    settings.useSettings.setState({ sound: true });
    render(<Gesture />);
    await loaded();
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    act(() => sound.setSound(false));
    await loaded();
    expect(audio.contexts[0]!.state).toBe("suspended");
  });

  test("turning it off suspends the context and silences the cues", async () => {
    const { settings, sound, Gesture } = await fresh();
    settings.useSettings.setState({ sound: true });
    render(<Gesture />);
    await loaded();
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    await loaded();
    act(() => sound.setSound(false));
    await loaded();
    expect(audio.contexts[0]!.state).toBe("suspended");
    audio.played.length = 0;
    sound.playCue("alert");
    expect(audio.played).toHaveLength(0);
    // And a click while it is off wakes nothing.
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    await loaded();
    expect(audio.contexts[0]!.state).toBe("suspended");
  });
});

describe("a click or a key a moment ago", () => {
  test("is told while sound is on, for half a second", async () => {
    const { settings, sound, Gesture } = await fresh();
    settings.useSettings.setState({ sound: true });
    render(<Gesture />);
    await loaded();
    expect(sound.recentGesture()).toBe(false);
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(10_000);
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    now.mockReturnValue(10_400);
    expect(sound.recentGesture()).toBe(true);
    now.mockReturnValue(10_600);
    expect(sound.recentGesture()).toBe(false);
    now.mockRestore();
  });
});

describe("the switch", () => {
  test("turning it on makes the context and plays a click, and it is saved", async () => {
    const { settings, sound, Gesture } = await fresh();
    render(<Gesture />);
    act(() => sound.setSound(true));
    await loaded();
    expect(settings.useSettings.getState().sound).toBe(true);
    expect(audio.contexts).toHaveLength(1);
    expect(audio.contexts[0]!.state).toBe("running");
    expect(audio.played.map((note) => note.freq)).toEqual(CUES.open.map((note) => note.freq));
    expect(JSON.parse(localStorage.getItem(settings.SETTINGS_KEY)!).state.sound).toBe(true);
  });

  test("turning it on, off and on again keeps one context", async () => {
    const { sound, Gesture } = await fresh();
    render(<Gesture />);
    act(() => sound.setSound(true));
    await loaded();
    act(() => sound.setSound(false));
    act(() => sound.setSound(true));
    await loaded();
    expect(audio.contexts).toHaveLength(1);
    expect(audio.contexts[0]!.state).toBe("running");
  });
});

test("the cues are named, each with notes of the two waves that are allowed", () => {
  expect(Object.keys(CUES).sort()).toEqual([...CUE_NAMES].sort());
  for (const notes of Object.values(CUES)) {
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(["square", "triangle"]).toContain(note.wave);
      expect(note.duration).toBeGreaterThan(0);
      expect(note.duration).toBeLessThan(1);
      expect(note.gain).toBeGreaterThan(0);
      expect(note.gain).toBeLessThanOrEqual(1);
    }
  }
});
