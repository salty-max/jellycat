import { createContext, useContext } from "react";

/** What the apps need from the desktop around them. */
export interface DesktopActions {
  /** Opens a project's Info window; the desktop's host moves the address to `/projects/<slug>`. */
  openProject: (slug: string) => void;
}

export const DesktopContext = createContext<DesktopActions>({ openProject: () => {} });

export const useDesktop = () => useContext(DesktopContext);
