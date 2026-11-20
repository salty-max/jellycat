import { useCallback, useEffect, useMemo, useRef } from "react";
import { DesktopContext } from "./apps/context";
import { ICON_TARGETS, ids, openFolder, openInfo, openTarget } from "./apps/launch";
import type { AppComponent } from "./registry";
import { MenuBar } from "./surface/menu-bar";
import { DesktopSurface } from "./surface/surface";
import { useWindows } from "./windows/store";
import { WindowLayer } from "./windows/window-layer";

const INFO_PREFIX = ids.info("");

export type DesktopProps = {
  /** The apps windows can hold; the registry's by default (stories pass their own). */
  registry?: Record<string, AppComponent>;
  /** The project the address names (`/projects/<slug>`): its Info window is open, over Projects. */
  slug?: string;
  /** A project was opened from the desktop: the host moves the address to its page. */
  onOpenProject?: (slug: string) => void;
  /** The Info window the address names was closed: the host moves the address back to the desktop. */
  onCloseProject?: (slug: string) => void;
};

/**
 * The desktop: the menu bar over the dithered surface, its windows over the icons, in the desktop's type (18px, as the mockup
 * sets it). A chunk of its own, which the layout loads on wide screens only. It starts with the Projects folder open, as the
 * mockup boots, and the address `/projects/<slug>` adds that project's Info window; back and forward open it and, back at the desktop, close it.
 */
export function Desktop({ registry, slug, onOpenProject, onCloseProject }: DesktopProps) {
  // The host's callbacks and the project the desktop wants an Info window for, read through a ref so they don't restart the effects
  // below. `wanted` runs ahead of `slug`: the address changes once the route's loader is done, an open from the desktop at once.
  const host = useRef<{ slug?: string; onCloseProject?: DesktopProps["onCloseProject"]; wanted?: string }>({ slug, onCloseProject });
  useEffect(() => {
    host.current.slug = slug;
    host.current.onCloseProject = onCloseProject;
  });

  const openProject = useCallback(
    (name: string) => {
      host.current.wanted = name;
      openInfo(name);
      onOpenProject?.(name);
    },
    [onOpenProject],
  );
  const actions = useMemo(() => ({ openProject }), [openProject]);

  // The address names the one Info window: a deep link opens it, back and forward move to the project they land on, and a window the
  // address no longer names closes. Projects opens first, once, so a desktop that remounts (the window crossed the breakpoint) keeps
  // its windows as they were.
  useEffect(() => {
    if (useWindows.getState().opened === 0) openFolder("projects");
    const asked = slug === host.current.wanted;
    host.current.wanted = slug;
    const { windows, close } = useWindows.getState();
    for (const id of Object.keys(windows)) if (id.startsWith(INFO_PREFIX) && id !== (slug && ids.info(slug))) close(id);
    // An open from the desktop opened its window already; opening it again would bring it in front of what was clicked since.
    if (slug && !asked) openInfo(slug);
  }, [slug]);

  // Closing the Info window the address names, or the one an open is waiting on, takes the address back to the desktop.
  useEffect(
    () =>
      useWindows.subscribe((state, before) => {
        for (const id of Object.keys(before.windows)) {
          if (!id.startsWith(INFO_PREFIX) || state.windows[id]) continue;
          const closed = id.slice(INFO_PREFIX.length);
          if (closed !== (host.current.wanted ?? host.current.slug)) continue;
          host.current.wanted = undefined;
          host.current.onCloseProject?.(closed);
        }
      }),
    [],
  );

  return (
    <DesktopContext.Provider value={actions}>
      <div className="flex size-full cursor-default flex-col text-lg leading-[1.1] select-none">
        <MenuBar />
        <div className="relative min-h-0 flex-1">
          <DesktopSurface onOpen={(id) => ICON_TARGETS[id] && openTarget(ICON_TARGETS[id], openProject)}>
            <WindowLayer registry={registry} />
          </DesktopSurface>
        </div>
      </div>
    </DesktopContext.Provider>
  );
}
