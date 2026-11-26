import { useEffect, useRef } from "react";

import { playCue, recentGesture } from "../../sound/sound";
import { REGISTRY, type AppComponent } from "../registry";
import { selectActive, useWindows } from "./store";
import { Window } from "./window";
import "./windows.css";

/** Every open window, in the stack's order, over the desktop. It tells the store how big the desktop is. Put it in a positioned box. */
export function WindowLayer({ registry = REGISTRY }: { registry?: Record<string, AppComponent> }) {
  const layer = useRef<HTMLDivElement>(null);
  const order = useWindows((state) => state.order);
  const windows = useWindows((state) => state.windows);
  const active = useWindows(selectActive);

  useEffect(() => {
    const element = layer.current;
    if (!element) return;
    const measure = () => {
      if (element.clientWidth > 0 && element.clientHeight > 0) useWindows.getState().setDesk({ w: element.clientWidth, h: element.clientHeight });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The windows' clicks: a high one when a window opens, a lower one when one closes. It lives here, in the desktop's chunk, so the
  // window store never reaches a phone; with sound off, or before the first click or key, `playCue` does nothing. Left silent:
  // - Restart and Shut Down clearing the store (`opened` goes back to 0, which a close never does): they have their own tone;
  // - the window the desktop opens by itself when it starts (the first, at `opened` 0);
  // - any change with no click or key a moment before it (the browser's Back between two projects).
  // One click that replaces a project's Info window with another's usually clicks twice, as two windows change (the second only if
  // the route's code and data came within the half second).
  useEffect(
    () =>
      useWindows.subscribe((state, previous) => {
        if (!recentGesture()) return;
        if (state.opened > previous.opened) {
          if (previous.opened > 0) playCue("open");
        } else if (state.opened === previous.opened && Object.keys(state.windows).length < Object.keys(previous.windows).length) playCue("close");
      }),
    [],
  );

  return (
    <div ref={layer} className="window-layer">
      {Object.values(windows)
        .sort((a, b) => a.seq - b.seq)
        .map((win) => {
        const App = registry[win.app];
        return App ? (
          <Window key={win.id} window={win} active={win.id === active} layer={order.indexOf(win.id)}>
            <App windowId={win.id} {...win.props} />
          </Window>
        ) : null;
      })}
    </div>
  );
}
