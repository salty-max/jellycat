/** One tone: an oscillator that starts `at` seconds after the cue, holds `duration` and may glide to `to`. */
type Note = {
  wave: "square" | "triangle";
  /** Hertz. */
  freq: number;
  /** Hertz the pitch glides to by the note's end. */
  to?: number;
  at: number;
  duration: number;
  /** 0 to 1, against the one master level. */
  gain: number;
};

/** The cues, one for each thing the system says aloud (docs/design.md Sound). */
export const CUE_NAMES = ["alert", "open", "close", "up", "down"] as const;
export type Cue = (typeof CUE_NAMES)[number];

/**
 * What each cue is made of. Everything is a plain square or triangle tone with a short envelope (app/os/sound/synth.ts), written for
 * this site: no sample, no file, nothing borrowed from another system.
 */
export const CUES: Record<Cue, readonly Note[]> = {
  // The alert's beep: a square tone with its octave below, so it carries on a small speaker.
  alert: [
    { wave: "square", freq: 880, at: 0, duration: 0.14, gain: 0.5 },
    { wave: "triangle", freq: 440, at: 0, duration: 0.14, gain: 0.7 },
  ],
  // A window opening: a short, high click. Closing: a lower one.
  open: [{ wave: "triangle", freq: 1320, to: 990, at: 0, duration: 0.035, gain: 0.8 }],
  close: [{ wave: "triangle", freq: 660, to: 440, at: 0, duration: 0.045, gain: 0.8 }],
  // Restart rises, Shut Down falls.
  up: [
    { wave: "triangle", freq: 220, to: 880, at: 0, duration: 0.5, gain: 0.7 },
    { wave: "square", freq: 440, to: 1760, at: 0.1, duration: 0.4, gain: 0.15 },
  ],
  down: [
    { wave: "triangle", freq: 660, to: 110, at: 0, duration: 0.6, gain: 0.7 },
    { wave: "square", freq: 330, to: 55, at: 0, duration: 0.5, gain: 0.15 },
  ],
};
