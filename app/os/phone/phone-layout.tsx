import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { Project } from "../../core/projects";
import type { Block } from "../../core/readme";
import { PhoneHome } from "./home";
import { PhonePage } from "./page";
import { PhoneProject } from "./project";
import { PhoneViewer } from "./viewer-dialog";

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
 * The OS on a phone: the home page, or the project the address names with its route's README (`blocks`, null when its chunk could not
 * be loaded), and the two dialogs. A picture opens the viewer at it, the header's button opens the Control Panel's sheet; each mounts
 * open, unmounts on close, and gives the focus back to what opened it. Nothing here reads the screen, so the prerendered markup and
 * the first client render are the same.
 */
export function PhoneLayout({ project, blocks }: { project: Project | undefined; blocks: readonly Block[] | null }) {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  // A move to another page while the viewer was open (a script, a link): its pictures aren't this page's.
  if (viewer && viewer.slug !== project?.slug) setViewer(null);

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
        {project ? (
          <PhoneProject key={project.slug} project={project} blocks={blocks} onOpenPicture={(start, opener) => setViewer({ slug: project.slug, start, opener })} />
        ) : (
          <PhoneHome />
        )}
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
