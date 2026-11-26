import { vi } from "vitest";

/** What a test can look at: every context made, and every oscillator started on any of them. */
type Played = { wave: string; freq: number; at: number; stop: number };

/**
 * A stand-in for `AudioContext` (jsdom has none). It starts suspended, as one made without a gesture does, and `resume()` runs it; it
 * records what was made and what was started, and nothing is heard.
 */
export function installFakeAudio() {
  const contexts: FakeContext[] = [];
  const played: Played[] = [];

  class FakeContext {
    state: "suspended" | "running" | "closed" = "suspended";
    currentTime = 0;
    destination = {};
    constructor() {
      contexts.push(this);
    }
    // As in a browser, the state changes once the promise settles, not as the call returns.
    async resume() {
      await Promise.resolve();
      this.state = "running";
    }
    async suspend() {
      await Promise.resolve();
      this.state = "suspended";
    }
    createGain() {
      const param = { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
      const node = { gain: param, connect: (to: unknown) => to, disconnect: vi.fn() };
      return node;
    }
    createOscillator() {
      const record: Played = { wave: "", freq: 0, at: 0, stop: 0 };
      const node = {
        type: "sine",
        frequency: {
          setValueAtTime: (freq: number, at: number) => {
            record.freq = freq;
            record.at = at;
          },
          exponentialRampToValueAtTime: vi.fn(),
        },
        onended: null as (() => void) | null,
        connect: (to: unknown) => to,
        start: () => void (record.wave = node.type),
        stop: (at: number) => {
          record.stop = at;
        },
      };
      played.push(record);
      return node;
    }
  }

  const session = { type: "auto" };
  vi.stubGlobal("AudioContext", FakeContext);
  Object.defineProperty(navigator, "audioSession", { value: session, configurable: true });
  return {
    contexts,
    played,
    session,
    restore() {
      vi.unstubAllGlobals();
      Reflect.deleteProperty(navigator, "audioSession");
    },
  };
}
