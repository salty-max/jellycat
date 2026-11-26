import { useEffect } from "react";
import { useSettings } from "../../core/settings";
import type { Cue } from "./cues";

// The sound code. This file is the part the page loads up front (a few lines: the context's life and the switch); the cues and the
// synth that draws them (cues.ts, synth.ts) are a chunk of their own, fetched once sound is on. With sound off nothing is fetched.
//
// A context made before a click or a key logs a warning in Chrome and plays nothing, so `unlock` is the only thing that makes one, and
// it is only called from a gesture. It is made here and not in the chunk: Safari wants the context made and resumed while the gesture is
// still being handled, and a chunk that is still being fetched would be too late for the first click.

type Synth = typeof import("./synth");
type AudioSession = { type: string };

let synth: Synth | null = null;
let loading: Promise<Synth> | null = null;
let context: AudioContext | null = null;
/** `suspend` was called since the last `unlock`. */
let suspended = false;

function load(): Promise<Synth> {
  loading ??= import("./synth").then(
    (module) => (synth = module),
    (error: unknown) => {
      loading = null;
      throw error;
    },
  );
  return loading;
}

/** Makes the context if there is none and runs it if it isn't running (a call or a tab switch suspends it on iOS). From a click or a key only. */
function unlock(): void {
  if (typeof AudioContext === "undefined") return;
  if (!context || context.state === "closed") {
    // Safari: `ambient` follows the ring/silent switch and never stops the visitor's music.
    const session = (navigator as Navigator & { audioSession?: AudioSession }).audioSession;
    if (session) session.type = "ambient";
    context = new AudioContext();
  }
  // A suspend still settling leaves the state at "running" for a moment: it is run again all the same, after it.
  if (context.state !== "running" || suspended) void context.resume().catch(() => {});
  suspended = false;
}

/** Sound went off: the context is kept, with its clock stopped, until the next `unlock`. */
function suspend(): void {
  // Whatever the state: a resume still settling would otherwise land after this and leave it running.
  if (!context || context.state === "closed") return;
  suspended = true;
  void context.suspend().catch(() => {});
}

/** Plays a cue, when sound is on and a gesture has already made the context. Never throws and never makes the context. */
export function playCue(cue: Cue): void {
  if (!useSettings.getState().sound) return;
  const current = context;
  if (!current || current.state === "closed") return;
  const run = (module: Synth) => {
    if (current.state === "running") module.schedule(current, cue);
    else void current.resume().then(() => module.schedule(current, cue), () => {});
  };
  if (synth) run(synth);
  else void load().then(run, () => {});
}

/**
 * The switch: stores the choice. Turning it on makes the context in this very click and plays a click, the checkbox's own; turning
 * it off stops the context. Call it from the click or key that flips it.
 */
export function setSound(on: boolean): void {
  useSettings.getState().set("sound", on);
  if (on) {
    unlock();
    playCue("open");
  } else suspend();
}

const GESTURES = ["pointerdown", "pointerup", "click", "keydown"] as const;
/** How long after a click or a key a window opening or closing still counts as that click's doing. */
const RECENT = 500;
let lastGesture = -Infinity;

/**
 * Whether a click or a key came a moment ago (only watched while sound is on). A window that opens or closes with no click behind it
 * (the browser's Back between two projects, a window widened from a phone's width) is silent: every sound follows a click or a key.
 */
export function recentGesture(): boolean {
  return performance.now() - lastGesture < RECENT;
}

/**
 * Mounted once, at the root. While sound is on (saved from an earlier visit, or just switched on) it fetches the chunk and, on each click
 * or key, makes the context or runs it again: the first click or key after a reload with sound saved on is what wakes it, and until
 * then the page is silent. With sound off it listens to nothing and the context, if there is one, is stopped.
 */
export function useSoundGesture(): void {
  const sound = useSettings((state) => state.sound);
  useEffect(() => {
    if (!sound) {
      suspend();
      return;
    }
    load().catch(() => {});
    const onGesture = (event: Event) => {
      lastGesture = performance.now();
      // Not everything that looks like a gesture is one to the browser: a finger going down may be a scroll (only a mouse's
      // pointerdown activates the page; a touch's pointerup and click do), and Escape never does. A context made on those logs
      // a warning in Chrome, so they wait for the next real one.
      if (event.type === "pointerdown" && (event as PointerEvent).pointerType !== "mouse") return;
      if (event.type === "keydown" && (event as KeyboardEvent).key === "Escape") return;
      unlock();
    };
    for (const type of GESTURES) document.addEventListener(type, onGesture, { capture: true, passive: true });
    return () => {
      for (const type of GESTURES) document.removeEventListener(type, onGesture, { capture: true });
    };
  }, [sound]);
}
