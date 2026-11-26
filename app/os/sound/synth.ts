import { CUES, type Cue } from "./cues";

/** The one level every cue plays at, a moderate one (the visitor's own volume does the rest). */
const MASTER_GAIN = 0.2;
const ATTACK = 0.004;
const FLOOR = 0.0001;

/**
 * Schedules a cue on a context: each note is an oscillator through a gain that rises over 4 ms and decays to silence by the note's
 * end, all through one master gain, so a click has no pop. Nothing here needs a file or a worklet.
 */
export function schedule(context: AudioContext, cue: Cue): void {
  const master = context.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(context.destination);
  const now = context.currentTime;
  let end = 0;
  let last: OscillatorNode | null = null;
  for (const note of CUES[cue]) {
    const start = now + note.at;
    const stop = start + note.duration;
    const oscillator = context.createOscillator();
    oscillator.type = note.wave;
    oscillator.frequency.setValueAtTime(note.freq, start);
    if (note.to) oscillator.frequency.exponentialRampToValueAtTime(note.to, stop);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(FLOOR, start);
    envelope.gain.exponentialRampToValueAtTime(note.gain, start + Math.min(ATTACK, note.duration / 2));
    envelope.gain.exponentialRampToValueAtTime(FLOOR, stop);
    oscillator.connect(envelope).connect(master);
    oscillator.start(start);
    oscillator.stop(stop + 0.02);
    if (stop >= end) {
      end = stop;
      last = oscillator;
    }
  }
  // The oscillators free themselves when they stop; the master gain goes with the last one.
  if (last) last.onended = () => master.disconnect();
}
