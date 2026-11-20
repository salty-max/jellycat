import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const PHOSPHORS = ["green", "amber", "white"] as const;
export type Phosphor = (typeof PHOSPHORS)[number];

export type Settings = {
  phosphor: Phosphor;
  scanlines: boolean;
  glow: boolean;
  /** Off by default, and never runs under prefers-reduced-motion (the CSS ignores it there). */
  flicker: boolean;
  /** The dither pattern on the desktop. */
  dither: boolean;
};

export const DEFAULT_SETTINGS: Settings = { phosphor: "green", scanlines: true, glow: true, flicker: false, dither: true };

/** localStorage key the store persists under, and the head script reads. */
export const SETTINGS_KEY = "jelly-os:settings";
/** The persisted shape's version. The head script ignores any other, as the store does. */
export const SETTINGS_VERSION = 1;

type Actions = {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
};

// skipHydration: the server and the first client render both use the defaults, so the markup matches; the saved values come in
// through rehydrateSettings() in an effect. First paint shows them anyway, through the <html data-*> attributes the head script sets.
export const useSettings = create<Settings & Actions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value }),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: SETTINGS_KEY,
      version: SETTINGS_VERSION,
      skipHydration: true,
      partialize: ({ phosphor, scanlines, glow, flicker, dither }) => ({ phosphor, scanlines, glow, flicker, dither }),
      // Whatever is in storage is checked: a hand-edited or older value falls back to its default instead of reaching the page.
      merge: (saved, current) => ({ ...current, ...sanitize(saved) }),
    },
  ),
);

export function sanitize(value: unknown): Partial<Settings> {
  if (typeof value !== "object" || value === null) return {};
  const v = value as Record<string, unknown>;
  const out: Partial<Settings> = {};
  if (PHOSPHORS.includes(v.phosphor as Phosphor)) out.phosphor = v.phosphor as Phosphor;
  for (const key of ["scanlines", "glow", "flicker", "dither"] as const) if (typeof v[key] === "boolean") out[key] = v[key];
  return out;
}

/** Reads the saved settings into the store. Call it once, in an effect. */
export function rehydrateSettings(): void | Promise<void> {
  return useSettings.persist.rehydrate();
}

/** The `<html data-*>` attributes for a set of settings: the head script's output, and what a story or a test compares it with. */
export function settingsAttributes(s: Settings): Record<string, string> {
  return {
    "data-phosphor": s.phosphor,
    "data-scanlines": String(s.scanlines),
    "data-glow": String(s.glow),
    "data-flicker": String(s.flicker),
    "data-dither": String(s.dither),
  };
}

/** Keeps <html data-*> in step with the store, so the CSS has one source whether the value came from the head script or a change. */
export function applySettings(s: Settings, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(settingsAttributes(s))) root.setAttribute(name, value);
}

/**
 * The head script, as source text: it runs before first paint, reads the saved settings and sets the same attributes. It is a string
 * so root.tsx can inline it (scripts/csp.ts hashes it at build) and a test can run the very text that ships. It must stay free of
 * anything that needs a build step, and it never throws: private mode or a broken value leaves the defaults the markup already has.
 */
export const HEAD_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_KEY)})||"null"),v=s&&s.version===${SETTINGS_VERSION}&&s.state;if(!v)return;var r=document.documentElement;if(${JSON.stringify(PHOSPHORS)}.indexOf(v.phosphor)>-1)r.setAttribute("data-phosphor",v.phosphor);["scanlines","glow","flicker","dither"].forEach(function(k){if(typeof v[k]==="boolean")r.setAttribute("data-"+k,String(v[k]))})}catch(e){}})()`;

/** Call once at the root: reads the saved settings in an effect (after hydration), then keeps <html data-*> in step with every change. */
export function useSettingsSync(): void {
  useEffect(() => {
    const unsubscribe = useSettings.subscribe((state) => applySettings(state));
    void rehydrateSettings();
    return unsubscribe;
  }, []);
}
