import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ComponentType } from "react";
import { useLocation, useMatches, useNavigate } from "react-router";
import { readmePath } from "../core/fs";
import { projectBySlug } from "../core/projects";
import type { Block } from "../core/readme";
import { BootScreen, ShutDownScreen } from "./boot-screen";
import { Crt } from "./crt";
import type { DesktopProps } from "./desktop/desktop";
import { isOsMatch } from "./os-route";
import { fullScreenViews } from "./full-screen-views";
import { Shell } from "./shell/shell";

/**
 * The desktop from 768px wide and 520px tall; anything smaller, a phone turned sideways included, gets the shell
 * (docs/phase-1.md). The one string both the page's CSS and `matchMedia` read.
 */
export const DESKTOP_QUERY = "(min-width: 768px) and (min-height: 520px)";

/** What the layout shows: before hydration both the shell and the boot screen are in the page and the CSS picks one. */
type LayoutName = "unknown" | "shell" | "boot" | "desktop" | "off";

type Media = "unknown" | "narrow" | "wide";
type ProjectData = { blocks: readonly Block[] | null };
type DesktopComponent = ComponentType<DesktopProps>;

/** The mockup's boot: the boot screen stays at least this long from the first paint, none under reduced motion. */
const BOOT_MS = 1300;

// Only the server snapshot ("unknown") renders this wrapper's value, so the rule holds until hydration and never after: a wide
// screen whose desktop chunk failed falls back to the shell with nothing hiding it.
const LAYOUT_CSS = `[data-layout="unknown"] [data-os="boot"]{display:none}@media ${DESKTOP_QUERY}{[data-layout="unknown"] [data-os="shell"]{display:none}[data-layout="unknown"] [data-os="boot"]{display:block}}`;

const wide = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_QUERY).matches;

let desktopChunk: Promise<DesktopComponent> | null = null;
/** The desktop's code, a chunk of its own: one request a page, kept even when it fails (the layout then stays on the shell). */
function loadDesktop() {
  desktopChunk ??= import("./desktop/desktop").then((module) => module.Desktop);
  return desktopChunk;
}
// On a wide screen the chunk starts with this module, before React hydrates, on a page that draws the OS (its prerendered
// `main[data-layout]`; 404.html has none); a phone never asks for it.
if (wide() && document.querySelector("main[data-layout]")) loadDesktop().catch(() => {});

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getSnapshot = (): Media => (wide() ? "wide" : "narrow");
const getServerSnapshot = (): Media => "unknown";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// A boot on the page's first wide layout counts from the navigation (the prerendered boot screen was there since the first
// paint); one after the window crossed the breakpoint, from the crossing.
let firstLayout = true;

/** The project the address names, with the README blocks its loader gave (null when the chunk could not be loaded). */
function useProjectRoute() {
  const match = useMatches().find((each) => isOsMatch(each) && each.params.slug);
  const project = match?.params.slug ? projectBySlug(match.params.slug) : undefined;
  return { project, blocks: (match?.loaderData as ProjectData | undefined)?.blocks ?? null };
}

/** Every README a page loader has given so far, by slug: a deep link's stays, so its `cat` never waits for the chunk again. */
function useReadmes(slug: string | undefined, blocks: readonly Block[] | null) {
  const [readmes, setReadmes] = useState<Readonly<Record<string, readonly Block[]>>>(() => (slug && blocks ? { [slug]: blocks } : {}));
  if (slug && blocks && !readmes[slug]) setReadmes({ ...readmes, [slug]: blocks });
  return readmes;
}

/**
 * The OS, drawn by the root so moving between its pages never remounts it. The server renders both the shell's session and the
 * boot screen and the CSS shows one; once hydrated, a wide screen loads the desktop (the boot screen meanwhile, at least
 * `BOOT_MS`) and a narrow one keeps the shell. A failed desktop chunk falls back to the shell; crossing the breakpoint swaps them.
 */
export function OsLayout() {
  const media = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [desktop, setDesktop] = useState<{ Desktop: DesktopComponent } | "failed" | null>(null);
  const [booted, setBooted] = useState(false);
  const [bootedFor, setBootedFor] = useState(media);
  // Special > Restart and Shut Down…: `off` shows the shut-down screen; `boots` counts the starts, so a restart boots again.
  const [off, setOff] = useState(false);
  const [boots, setBoots] = useState(0);
  // Leaving the wide layout ends its boot (and a shut-down): the next crossing boots again.
  if (bootedFor !== media) {
    setBootedFor(media);
    setBooted(false);
    setOff(false);
  }
  const restart = useCallback(() => {
    setOff(false);
    setBooted(false);
    setBoots((count) => count + 1);
  }, []);
  const shutDown = useCallback(() => setOff(true), []);

  useEffect(() => {
    if (media === "unknown") return;
    const first = firstLayout;
    firstLayout = false;
    if (media !== "wide") return;
    let live = true;
    loadDesktop().then(
      (Desktop) => live && setDesktop({ Desktop }),
      () => live && setDesktop("failed"),
    );
    const wait = reducedMotion() ? 0 : Math.max(0, BOOT_MS - (first ? performance.now() : 0));
    const timer = setTimeout(() => live && setBooted(true), wait);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [media, boots]);

  const layout: LayoutName =
    media === "unknown" ? "unknown" : media === "narrow" || desktop === "failed" ? "shell" : off ? "off" : desktop && booted ? "desktop" : "boot";

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { project, blocks } = useProjectRoute();
  const readmes = useReadmes(project?.slug, blocks);
  // The address follows the project: an `open` (or a pressed name) goes to its page, and back and forward walk the pages.
  const openProject = useCallback(
    (slug: string) => {
      const to = `/projects/${slug}`;
      if (pathname !== to) navigate(to);
    },
    [navigate, pathname],
  );
  // Closing the Info window the address names (or one an open is waiting on) goes back to the desktop at `/`.
  const closeProject = useCallback(() => navigate("/"), [navigate]);
  // A project's page opens on its card and its README, as if typed: the text phones, crawlers and link previews read.
  const initialCommand = useMemo(() => (project ? [`open ${project.slug}`, `cat ${readmePath(project)}`] : undefined), [project]);
  const Desktop = desktop && desktop !== "failed" ? desktop.Desktop : null;

  return (
    <main className="h-dvh" data-layout={layout}>
      <style href="jelly-os-layout" precedence="default">
        {LAYOUT_CSS}
      </style>
      <Crt>
        {(layout === "unknown" || layout === "shell") && (
          <div data-os="shell" className="size-full">
            <Shell onOpenProject={openProject} initialCommand={initialCommand} readmes={readmes} fullScreen={fullScreenViews} autoFocus={layout === "shell"} />
          </div>
        )}
        {(layout === "unknown" || layout === "boot") && (
          <div data-os="boot" className="size-full">
            <BootScreen />
          </div>
        )}
        {layout === "off" && <ShutDownScreen onRestart={restart} />}
        {layout === "desktop" && Desktop && (
          <Desktop slug={project?.slug} onOpenProject={openProject} onCloseProject={closeProject} onRestart={restart} onShutDown={shutDown} />
        )}
      </Crt>
    </main>
  );
}
