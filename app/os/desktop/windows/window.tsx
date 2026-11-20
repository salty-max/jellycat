import { useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import { Glyph } from "../../icons/icon";
import { COLLAPSED_HEIGHT, KEY_STEP } from "./geometry";
import { useWindows, type WindowState } from "./store";
import "./windows.css";

type WindowProps = {
  window: WindowState;
  /** The window in front: its title bar is inverse. */
  active: boolean;
  /** Its place in the stack, back to front. */
  layer: number;
  children?: ReactNode;
};

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** A window: a 1px frame with a title bar (collapse, zoom and close boxes) and a grip. Its place and size are the store's. */
export function Window({ window: win, active, layer, children }: WindowProps) {
  const { id } = win;
  const titleId = useId();
  const frame = useRef<HTMLDivElement>(null);
  const { focus, close, toggleCollapse, toggleZoom, moveTo, moveBy, resizeTo, resizeBy } = useWindows.getState();

  // Focus goes into the window when it opens, unless the app already put it somewhere inside, and back to what had it before when
  // the window closes. The window is non-modal: nothing around it is inert.
  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = frame.current;
    if (element && !element.contains(document.activeElement)) element.focus({ preventScroll: true });
    return () => {
      // Only when the focus is still in the window (or nowhere): a window closed from outside doesn't take it from what has it.
      const here = document.activeElement;
      if (opener?.isConnected && (here === document.body || here === null || element?.contains(here))) opener.focus({ preventScroll: true });
    };
  }, []);

  // A second open of a window already open takes the focus in too. (Not every change of the window in front does: when one closes,
  // the focus goes back to its opener, not into the window behind.)
  const entered = useWindows((state) => (state.entered?.id === id ? state.entered.n : 0));
  useEffect(() => {
    const element = frame.current;
    if (entered > 0 && element && !element.contains(document.activeElement)) element.focus({ preventScroll: true });
  }, [entered]);

  const dragTitle = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    const bar = event.currentTarget;
    bar.setPointerCapture?.(event.pointerId);
    const [startX, startY, fromX, fromY] = [event.clientX, event.clientY, win.x, win.y];
    const move = (next: globalThis.PointerEvent) => next.buttons !== 0 && moveTo(id, fromX + next.clientX - startX, fromY + next.clientY - startY);
    const stop = () => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", stop);
      bar.removeEventListener("pointercancel", stop);
      bar.removeEventListener("lostpointercapture", stop);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", stop);
    bar.addEventListener("pointercancel", stop);
    bar.addEventListener("lostpointercapture", stop);
  };

  const dragGrip = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    focus(id);
    const grip = event.currentTarget;
    grip.setPointerCapture?.(event.pointerId);
    const [startX, startY, fromW, fromH] = [event.clientX, event.clientY, win.w, win.h];
    const move = (next: globalThis.PointerEvent) => next.buttons !== 0 && resizeTo(id, fromW + next.clientX - startX, fromH + next.clientY - startY);
    const stop = () => {
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", stop);
      grip.removeEventListener("pointercancel", stop);
      grip.removeEventListener("lostpointercapture", stop);
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", stop);
    grip.addEventListener("pointercancel", stop);
    grip.addEventListener("lostpointercapture", stop);
  };

  // Arrows on the focused title bar move the window, Shift+arrows resize it.
  const keyTitle = (event: KeyboardEvent<HTMLDivElement>) => {
    const arrow = ARROWS[event.key];
    if (!arrow || event.target !== event.currentTarget) return;
    event.preventDefault();
    const [dx, dy] = [arrow[0] * KEY_STEP, arrow[1] * KEY_STEP];
    if (event.shiftKey) {
      if (!win.collapsed) resizeBy(id, dx, dy);
    } else moveBy(id, dx, dy);
  };

  return (
    <div
      ref={frame}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="window"
      data-active={active || undefined}
      data-collapsed={win.collapsed || undefined}
      style={{ left: win.x, top: win.y, width: win.w, height: win.collapsed ? COLLAPSED_HEIGHT : win.h, zIndex: layer + 1 }}
      onPointerDownCapture={() => focus(id)}
      onFocusCapture={() => focus(id)}
    >
      <div className="window-bar" role="group" tabIndex={0} aria-label={`${win.title}: arrows move, Shift and arrows resize`} onPointerDown={dragTitle} onKeyDown={keyTitle}>
        <span id={titleId} className="window-title">
          {win.title}
        </span>
        <span className="window-boxes">
          <button type="button" aria-label="Collapse" aria-pressed={win.collapsed} onClick={() => toggleCollapse(id)}>
            <Glyph name="min" />
          </button>
          <button type="button" aria-label="Zoom" aria-pressed={win.restore !== null} onClick={() => toggleZoom(id)}>
            <Glyph name="max" />
          </button>
          <button type="button" aria-label="Close" onClick={() => close(id)}>
            <Glyph name="x" />
          </button>
        </span>
      </div>
      <div className="window-body" hidden={win.collapsed}>
        {children}
      </div>
      {win.collapsed ? null : <div className="window-grip" aria-hidden="true" onPointerDown={dragGrip} />}
    </div>
  );
}
