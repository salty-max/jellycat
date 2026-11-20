import type { AppComponent } from "./registry";
import { MenuBar } from "./surface/menu-bar";
import { DesktopSurface } from "./surface/surface";
import { WindowLayer } from "./windows/window-layer";

type DesktopProps = {
  /** The apps windows can hold; the registry's by default (stories pass their own). */
  registry?: Record<string, AppComponent>;
};

/**
 * The desktop: the menu bar over the dithered surface, its windows over the icons, in the desktop's type (18px, as the mockup
 * sets it). A chunk of its own, which the layout loads on wide screens only. Opening an icon does nothing until the apps exist
 * (D3 adds them to the registry and opens them here).
 */
export function Desktop({ registry }: DesktopProps) {
  return (
    <div className="flex size-full cursor-default flex-col text-lg leading-[1.1] select-none">
      <MenuBar />
      <div className="relative min-h-0 flex-1">
        <DesktopSurface onOpen={() => {}}>
          <WindowLayer registry={registry} />
        </DesktopSurface>
      </div>
    </div>
  );
}
