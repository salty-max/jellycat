import { create } from "zustand";

import { cascade, centered, clampPosition, clampSize, zoomRect, type Rect, type Size } from "./geometry";

export type WindowState = Rect & {
  id: string;
  /** The registry's key: which component fills the window. */
  app: string;
  title: string;
  /** What the app is given besides its window id. */
  props: Record<string, unknown>;
  /** Its place in the opening order: the layer renders in this order, so a raised window never moves in the DOM (that would drop its pointer capture and its focus). */
  seq: number;
  collapsed: boolean;
  /** Where the window was before zoom; set while zoomed. */
  restore: Rect | null;
};

export type OpenOptions = {
  /** A second open with the same id focuses the window instead of opening another. Defaults to the app id. */
  id?: string;
  app: string;
  title: string;
  size: Size;
  props?: Record<string, unknown>;
  /** Placed in the middle instead of cascaded, for a window that stands in for a dialog. */
  center?: boolean;
};

type WindowsState = {
  desk: Size;
  /** Back to front: the last one is in front. A window's z-index is its place here. */
  order: string[];
  windows: Record<string, WindowState>;
  /** Windows opened so far; numbers each one's `seq`. */
  opened: number;
  /** The last window opened again while already open: it takes the focus in (the window's own effect watches this). */
  entered: { id: string; n: number } | null;
};

type Actions = {
  setDesk: (desk: Size) => void;
  open: (options: OpenOptions) => string;
  focus: (id: string) => void;
  close: (id: string) => void;
  toggleCollapse: (id: string) => void;
  toggleZoom: (id: string) => void;
  moveTo: (id: string, x: number, y: number) => void;
  moveBy: (id: string, dx: number, dy: number) => void;
  resizeTo: (id: string, w: number, h: number) => void;
  resizeBy: (id: string, dw: number, dh: number) => void;
};

// The first cascade step no open window already sits on, so a new window never hides one exactly.
function freeSlot(state: WindowsState, size: Size) {
  const taken = Object.values(state.windows);
  for (let index = 0; ; index++) {
    const at = cascade(index, size, state.desk);
    if (index > taken.length || !taken.some((win) => win.x === at.x && win.y === at.y)) return at;
  }
}

// The desktop's size until the layer measures it: the mockup's frame.
const DEFAULT_DESK: Size = { w: 652, h: 456 };

export const useWindows = create<WindowsState & Actions>()((set, get) => {
  const update = (id: string, change: (window: WindowState) => Partial<WindowState>) =>
    set((state) => {
      const current = state.windows[id];
      return current ? { windows: { ...state.windows, [id]: { ...current, ...change(current) } } } : state;
    });

  return {
    desk: DEFAULT_DESK,
    order: [],
    windows: {},
    opened: 0,
    entered: null,

    // A smaller desktop pulls the windows back in, so none is left with its title bar out of reach.
    setDesk: (desk) =>
      set((state) => {
        if (state.desk.w === desk.w && state.desk.h === desk.h) return state;
        const windows = Object.fromEntries(
          Object.entries(state.windows).map(([id, win]) => {
            const next = { ...win, ...clampPosition(win.x, win.y, win.w, desk) };
            if (win.restore) next.restore = { ...win.restore, ...clampPosition(win.restore.x, win.restore.y, win.restore.w, desk) };
            return [id, next];
          }),
        );
        return { desk, windows };
      }),

    open: ({ id, app, title, size, props = {}, center = false }) => {
      const windowId = id ?? app;
      if (get().windows[windowId]) {
        get().focus(windowId);
        set((state) => ({ entered: { id: windowId, n: (state.entered?.n ?? 0) + 1 } }));
        return windowId;
      }
      set((state) => {
        const at = center ? centered(size, state.desk) : freeSlot(state, size);
        const window: WindowState = { id: windowId, app, title, props, ...at, ...size, collapsed: false, restore: null, seq: state.opened };
        return { windows: { ...state.windows, [windowId]: window }, order: [...state.order, windowId], opened: state.opened + 1 };
      });
      return windowId;
    },

    focus: (id) =>
      set((state) => {
        if (!state.windows[id] || state.order[state.order.length - 1] === id) return state;
        return { order: [...state.order.filter((other) => other !== id), id] };
      }),

    // The window behind comes to the front.
    close: (id) =>
      set((state) => {
        if (!state.windows[id]) return state;
        const windows = { ...state.windows };
        delete windows[id];
        return { windows, order: state.order.filter((other) => other !== id) };
      }),

    toggleCollapse: (id) => update(id, ({ collapsed }) => ({ collapsed: !collapsed })),

    // Zoom fills the desktop and unfolds a collapsed window; a second zoom puts it back where it was.
    toggleZoom: (id) =>
      update(id, (window) => {
        if (window.restore) return { ...window.restore, restore: null, collapsed: false };
        const { x, y, w, h } = window;
        return { ...zoomRect(get().desk), restore: { x, y, w, h }, collapsed: false };
      }),

    moveTo: (id, x, y) => update(id, (window) => clampPosition(x, y, window.w, get().desk)),
    moveBy: (id, dx, dy) => update(id, (window) => clampPosition(window.x + dx, window.y + dy, window.w, get().desk)),
    resizeTo: (id, w, h) => update(id, () => clampSize(w, h)),
    resizeBy: (id, dw, dh) => update(id, (window) => clampSize(window.w + dw, window.h + dh)),
  };
});

/** The id of the window in front, or null. */
export const selectActive = (state: WindowsState) => state.order[state.order.length - 1] ?? null;
