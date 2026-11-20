import type { ComponentType } from "react";

/** What every app in a window is given: its window's id, then the `props` it was opened with (typed by the app itself). */
export type AppProps = { windowId: string };

// The props beyond `windowId` are whatever the opener passed in `open({ props })`: each app types its own, so the registry can't.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppComponent = ComponentType<any>;

/**
 * App id → the component that fills a window opened with that `app`. C2a owns the file and starts it empty; each task that adds an
 * app adds one line (`projects: ProjectsFolder,`), and a rebase conflict on it goes to the later task.
 */
export const REGISTRY: Record<string, AppComponent> = {};
