import { useEffect, useState, type ComponentType } from "react";
import "../desktop/apps/apps.css";

type LabComponent = ComponentType<{ windowId: string }>;
type Loader = () => Promise<LabComponent>;

// The Lab's code (the window, its menu, the run's glue) is a chunk of its own, loaded when the window opens: the desktop's chunk
// doesn't carry it, and the module it runs only loads on the first Run. A chunk that could not be loaded (the connection dropped,
// or an old page after a deploy) is said in the window, and the next window to open tries the download again.
let chunk: Promise<LabComponent> | null = null;
const loadChunk: Loader = () => (chunk ??= import("./lab-window").then((module) => module.LabWindow)).catch((error: unknown) => {
  chunk = null;
  throw error;
});

export const COULD_NOT_LOAD_LAB = "could not load the Lab";

/** The registry's entry for the Lab: the window's content, loaded when the window opens. `load` is for tests. */
export function LabApp({ windowId, load = loadChunk }: { windowId: string; load?: Loader }) {
  const [view, setView] = useState<{ Component: LabComponent } | "failed" | null>(null);
  useEffect(() => {
    let live = true;
    load().then(
      (Component) => live && setView({ Component }),
      () => live && setView("failed"),
    );
    return () => {
      live = false;
    };
  }, [load]);
  if (view === "failed") return <p className="app-lab-failed">{COULD_NOT_LOAD_LAB}</p>;
  return view ? <view.Component windowId={windowId} /> : null;
}
