import type { ComponentType } from "react";
import { ControlPanel } from "./apps/control-panel";
import { FolderWindow } from "./apps/folder";
import { ProjectInfo } from "./apps/project-info";
import { ProjectReadme, StudioReadme, ViewerPlaceholder } from "./apps/readme-windows";
import { TerminalApp } from "./apps/terminal";

/** What every app in a window is given: its window's id, then the `props` it was opened with (typed by the app itself). */
export type AppProps = { windowId: string };

// The props beyond `windowId` are whatever the opener passed in `open({ props })`: each app types its own, so the registry can't.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppComponent = ComponentType<any>;

/**
 * App id → the component that fills a window opened with that `app`. C2a owns the file and starts it empty; each task that adds an
 * app adds one line (`projects: ProjectsFolder,`), and a rebase conflict on it goes to the later task.
 */
export const REGISTRY: Record<string, AppComponent> = {
  folder: FolderWindow,
  info: ProjectInfo,
  "project-readme": ProjectReadme,
  readme: StudioReadme,
  panel: ControlPanel,
  terminal: TerminalApp,
  viewer: ViewerPlaceholder, // E2 replaces this line with the screenshot viewer.
};
