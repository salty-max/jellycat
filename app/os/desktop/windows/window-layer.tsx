import { useEffect, useRef } from "react";

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
