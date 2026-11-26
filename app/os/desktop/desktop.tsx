import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DesktopContext } from "./apps/context";
import type { OsPage } from "../os-route";
import { ICON_TARGETS, openFolder, openTarget } from "./apps/launch";
import { closesOnMove, pageWindow, type PageWindow } from "./apps/page-windows";
import { SystemMenus } from "./menubar/menus";
import type { AppComponent } from "./registry";
import { MenuBar } from "./surface/menu-bar";
import { DesktopSurface } from "./surface/surface";
import { useWindows } from "./windows/store";
import { WindowLayer } from "./windows/window-layer";

export type DesktopProps = {
  /** The apps windows can hold; the registry's by default (stories pass their own). */
  registry?: Record<string, AppComponent>;
  /** The page the address names: the window it opens (`page-windows.ts`, a project's Info) is open, over Projects. */
  route?: OsPage;
  /** A page's window was opened from the desktop (a project's Info): the host moves the address to that page's. */
  onOpenPage?: (path: string) => void;
  /** The window the address names was closed (its id): the host moves the address back to the desktop. */
  onClosePage?: (id: string) => void;
  /** Special > Restart: the windows are closed; the host shows the boot screen again. */
  onRestart?: () => void;
  /** Special > Shut Down…, once confirmed: the windows are closed; the host shows the shut-down screen. */
  onShutDown?: () => void;
};

/**
 * The desktop: the menu bar over the dithered surface, its windows over the icons, in the desktop's type (18px, as the mockup
 * sets it). A chunk of its own, which the layout loads on wide screens only. It starts with the Projects folder open, as the
 * mockup boots, and a page's address adds the window that page opens (`/projects/<slug>`, that project's Info window); back and
 * forward bring it to the front and, once the address leaves it, close it if it is an Info window.
 */
export function Desktop({ registry, route, onOpenPage, onClosePage, onRestart, onShutDown }: DesktopProps) {
  // The boxes the drop-downs and the dialogs are drawn in, held in state so they are set before either opens.
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [deskBox, setDeskBox] = useState<HTMLElement | null>(null);
  // The window the address names (none at `/`), the host's callback and the window an open from the desktop is waiting on, read
  // through a ref so they don't restart the effects below. `wanted` runs ahead of `named`: the address changes once the route's loader
  // is done, an open from the desktop at once.
  const named = route && pageWindow(route.page, route.params);
  const host = useRef<{ named?: PageWindow; onClosePage?: DesktopProps["onClosePage"]; wanted?: string }>({ named, onClosePage });
  useEffect(() => {
    host.current.named = named;
    host.current.onClosePage = onClosePage;
  });

  // Opens a page's window and moves the address to the page; the window is open before the address catches up.
  const openPage = useCallback(
    (path: string, win: PageWindow | undefined) => {
      if (!win) return;
      host.current.wanted = win.id;
      win.open();
      onOpenPage?.(path);
    },
    [onOpenPage],
  );
  const openProject = useCallback((slug: string) => openPage(`/projects/${slug}`, pageWindow("project", { slug })), [openPage]);
  const actions = useMemo(() => ({ openProject }), [openProject]);

  // The address names one window: a deep link opens it, back and forward bring the one they land on to the front, and an Info window
  // the address no longer names closes (any other window stays, with what it holds). Projects opens first, once, so a desktop that
  // remounts (the window crossed the breakpoint) keeps its windows as they were.
  const namedId = named?.id;
  useEffect(() => {
    if (useWindows.getState().opened === 0) openFolder("projects");
    const asked = namedId === host.current.wanted;
    host.current.wanted = namedId;
    const { windows, close } = useWindows.getState();
    for (const id of Object.keys(windows)) if (closesOnMove(id) && id !== namedId) close(id);
    // An open from the desktop opened its window already; opening it again would bring it in front of what was clicked since.
    if (!asked) host.current.named?.open();
  }, [namedId]);

  // Closing the window the address names, or the one an open is waiting on, takes the address back to the desktop.
  useEffect(
    () =>
      useWindows.subscribe((state, before) => {
        for (const id of Object.keys(before.windows)) {
          if (state.windows[id] || id !== (host.current.wanted ?? host.current.named?.id)) continue;
          host.current.wanted = undefined;
          host.current.onClosePage?.(id);
        }
      }),
    [],
  );

  return (
    <DesktopContext.Provider value={actions}>
      <div ref={setRoot} className="relative flex size-full cursor-default flex-col text-lg leading-[1.1] select-none">
        <MenuBar>
          <SystemMenus container={root} dialogContainer={deskBox} onRestart={onRestart} onShutDown={onShutDown} />
        </MenuBar>
        <div ref={setDeskBox} className="relative min-h-0 flex-1">
          <DesktopSurface onOpen={(id) => ICON_TARGETS[id] && openTarget(ICON_TARGETS[id], openProject)}>
            <WindowLayer registry={registry} />
          </DesktopSurface>
        </div>
      </div>
    </DesktopContext.Provider>
  );
}
