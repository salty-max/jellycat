import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Outlet } from "react-router";
import type { OsPage } from "../os-route";
import type { PhoneOutletContext } from "./outlet";
import { PhonePage } from "./page";
import { PhoneViewer } from "./viewer-dialog";
// The README's styles stay in the root's stylesheets, though the project page that uses them comes with its route: that route takes
// any slug, so 404.html (prerendered for the not-found route) hydrates under it at /projects/no-such, and a stylesheet of the
// project route's own would be a link in the head that 404.html lacks, a hydration mismatch. A route that matches only its own
// prerendered addresses can bring its own.
import "../readme/readme.css";

type ViewerState = { slug: string; start: number; opener: HTMLElement };
type SheetProps = { onClose: () => void; returnFocus?: HTMLElement | null };

type SheetComponent = (props: SheetProps) => ReactNode;

// The sheet's code (the desktop Control Panel's radios and checkboxes) is a chunk of its own, so the page doesn't wait for it; it is
// fetched once the browser is idle, and is there by the time the header's button is pressed.
let sheetChunk: Promise<{ default: SheetComponent }> | null = null;
function loadSheet() {
  sheetChunk ??= import("./control-panel-sheet").then(
    (module) => ({ default: module.ControlPanelSheet }),
    () => ({ default: SheetUnavailable }),
  );
  return sheetChunk;
}
let ControlPanelSheet = lazy(loadSheet);

/**
 * A sheet whose code could not be loaded (the connection dropped, or an old page after a deploy): it closes at once, the header's
 * button goes back to closed, and the next press tries the download again. `lazy` keeps what it first loaded, so a new one is made.
 */
function SheetUnavailable({ onClose }: SheetProps) {
  useEffect(() => {
    sheetChunk = null;
    ControlPanelSheet = lazy(loadSheet);
    onClose();
  }, [onClose]);
  return null;
}

/**
 * The OS on a phone: the page the address names, which is its route's element (each OS route draws its page for the phone, so a page's
 * code comes in its route's chunk, not in the root's), and the two dialogs. A picture opens the viewer at it, the header's button
 * opens the Control Panel's sheet; each mounts open, unmounts on close, and gives the focus back to what opened it. Nothing here
 * reads the screen, so the prerendered markup and the first client render are the same.
 */
export function PhoneLayout({ route }: { route: OsPage | undefined }) {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  // A move to another page while the viewer was open (a script, a link): its pictures aren't this page's.
  if (viewer && viewer.slug !== route?.params.slug) setViewer(null);
  const outlet = useMemo<PhoneOutletContext>(() => ({ onOpenPicture: (slug, start, opener) => setViewer({ slug, start, opener }) }), []);

  useEffect(() => {
    // Safari has no requestIdleCallback: a moment after the page is up does as well.
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => void loadSheet());
      return () => cancelIdleCallback(id);
    }
    const timer = setTimeout(() => void loadSheet(), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <PhonePage onOpenPanel={setPanel} panelOpen={panel !== null}>
        <Outlet context={outlet} />
      </PhonePage>
      {/* Beside the page, not in it: the page's own rules (its buttons' reset) aren't the dialogs'. */}
      {viewer && <PhoneViewer slug={viewer.slug} start={viewer.start} returnFocus={viewer.opener} onClose={() => setViewer(null)} />}
      {panel && (
        <Suspense fallback={null}>
          <ControlPanelSheet returnFocus={panel} onClose={() => setPanel(null)} />
        </Suspense>
      )}
    </>
  );
}
