// The window manager's arithmetic, from the desktop mockup (mockups/phosphor-desktop.html): where a new window goes, how far a
// window may be dragged, how small it may get, and what zoom fills. All in the desktop's own pixels.

export type Rect = { x: number; y: number; w: number; h: number };
export type Size = { w: number; h: number };

/** Width of the icon column on the desktop's right. Zoom and cascade keep clear of it. */
export const ICON_COLUMN = 104;
/** The title bar's height, border included. */
export const TITLE_BAR = 22;
/** A window's collapsed height: its title bar and the 1px frame above and below. */
export const COLLAPSED_HEIGHT = TITLE_BAR + 2;
/** How much of a window must stay on the desktop when it is dragged out: 60px across, the title bar down. */
export const KEEP_VISIBLE = 60;
export const MIN_SIZE: Size = { w: 220, h: 120 };
/** The keyboard's step for arrows (move) and Shift+arrows (resize). */
export const KEY_STEP = 8;

const MARGIN = 8;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** The mockup's drag clamp: 60px of the window stays in view across, and the title bar never leaves the top or the bottom. */
export function clampPosition(x: number, y: number, w: number, desk: Size): { x: number; y: number } {
  return {
    x: Math.round(clamp(x, KEEP_VISIBLE - w, desk.w - KEEP_VISIBLE)),
    y: Math.round(clamp(y, 0, desk.h - TITLE_BAR)),
  };
}

/** The mockup's resize clamp: a minimum size, no maximum. */
export function clampSize(w: number, h: number): Size {
  return { w: Math.max(MIN_SIZE.w, Math.round(w)), h: Math.max(MIN_SIZE.h, Math.round(h)) };
}

/** Each new window steps 26px right and 24px down from the one before it, and stays clear of the icon column and the bottom edge. */
export function cascade(index: number, size: Size, desk: Size): { x: number; y: number } {
  return {
    x: Math.max(MARGIN, Math.min(16 + index * 26, desk.w - size.w - ICON_COLUMN)),
    y: Math.max(MARGIN, Math.min(10 + index * 24, desk.h - size.h - MARGIN)),
  };
}

/** A dialog sits in the middle, a little above the centre. */
export function centered(size: Size, desk: Size): { x: number; y: number } {
  return { x: Math.round((desk.w - size.w) / 2), y: Math.round((desk.h - size.h) / 2.5) };
}

/** What zoom fills: the desktop less the icon column and an 8px margin. */
export function zoomRect(desk: Size): Rect {
  return { x: MARGIN, y: MARGIN, w: Math.max(MIN_SIZE.w, desk.w - ICON_COLUMN - MARGIN), h: Math.max(MIN_SIZE.h, desk.h - 2 * MARGIN) };
}
