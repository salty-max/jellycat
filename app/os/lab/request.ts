import { create } from "zustand";

/** What the Terminal asks of the Lab: the program to pick (by its name), and whether to run it. `n` tells two asks for the same program apart. */
export interface LabRequest {
  program: string;
  run: boolean;
  n: number;
}

interface LabRequests {
  request: LabRequest | null;
  /** The next ask replaces the one still waiting; null drops it (a plain open of the window asks for nothing). */
  ask: (request: { program: string; run: boolean } | null) => void;
  /** The window took request `n`: it is gone, unless a newer one replaced it meanwhile. */
  take: (n: number) => void;
}

let count = 0;

/**
 * The hand-over from `gero run <program>` to the Lab's window, in the one place both can see. The window's code arrives after it
 * opens and its programs after that, so an ask waits here until a window with programs takes it; one already open takes it at once.
 */
export const useLabRequests = create<LabRequests>((set) => ({
  request: null,
  ask: (request) => set({ request: request && { ...request, n: ++count } }),
  take: (n) => set((state) => (state.request?.n === n ? { request: null } : state)),
}));
