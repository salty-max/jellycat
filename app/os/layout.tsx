import { useCallback, useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { useLocation, useMatches, useNavigate } from "react-router";
import { BootScreen, ShutDownScreen } from "./boot-screen";
import { Crt } from "./crt";
import type { DesktopProps } from "./desktop/desktop";
import { osPage } from "./os-route";
import { PhoneLayout } from "./phone/phone-layout";

/**
 * The desktop from 768px wide and 520px tall; anything smaller, a phone turned sideways included, gets the phone's page
 * (docs/phone-plan.md). The one string both the page's CSS and `matchMedia` read.
 */
export const DESKTOP_QUERY = "(min-width: 768px) and (min-height: 520px)";

/** What the layout shows: before hydration both the phone's page and the boot screen are in the page and the CSS picks one. */
type LayoutName = "unknown" | "phone" | "boot" | "desktop" | "off";

type Media = "unknown" | "narrow" | "wide";
type DesktopComponent = ComponentType<DesktopProps>;

/** The mockup's boot: the boot screen stays at least this long from the first paint, none under reduced motion. */
const BOOT_MS = 1300;

// Only the server snapshot ("unknown") renders this wrapper's value, so the rules on it hold until hydration and never after: a wide
// screen whose desktop chunk failed falls back to the phone's page with nothing hiding it. Above the breakpoint the wrapper is one
// screen tall from the first paint (the class takes over once hydrated), so nothing shifts when the desktop replaces the boot
// screen; below it the page is as tall as its content. Wherever the phone's page shows, the page's own background is the tube's,
// not the black around the desktop's rounded screen, so iOS's overscroll and the end of a short page stay in the phosphor.
const LAYOUT_CSS = `[data-layout="unknown"] [data-os="tube"]{display:none}body:has([data-layout="phone"]){background:var(--phosphor-bg)}@media not all and ${DESKTOP_QUERY}{body:has([data-layout="unknown"]){background:var(--phosphor-bg)}}@media ${DESKTOP_QUERY}{[data-layout="unknown"]{height:100dvh}[data-layout="unknown"] [data-os="phone"]{display:none}[data-layout="unknown"] [data-os="tube"]{display:block}}`;

/**
 * Without JavaScript a wide screen would show the boot screen forever: it shows the phone's page instead, its column centred. Inline,
 * as the layout's own CSS is, so the CSP doesn't change.
 */
export const NOSCRIPT_CSS = `@media ${DESKTOP_QUERY}{[data-layout="unknown"]{height:auto}[data-layout="unknown"] [data-os="phone"]{display:block}[data-layout="unknown"] [data-os="tube"]{display:none}body:has([data-layout="unknown"]){background:var(--phosphor-bg)}}`;

const wide = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_QUERY).matches;

let desktopChunk: Promise<DesktopComponent> | null = null;
/** The desktop's code, a chunk of its own: one request a page, kept even when it fails (the layout then stays on the phone's page). */
function loadDesktop() {
  desktopChunk ??= import("./desktop/desktop").then((module) => module.Desktop);
  return desktopChunk;
}
// On a wide screen the chunk starts with this module, before React hydrates, on a page that draws the OS (its prerendered
// `[data-layout]`; 404.html has none); a phone never asks for it.
if (wide() && document.querySelector("[data-layout]")) loadDesktop().catch(() => {});

/** A field an on-screen keyboard comes up for. */
const TEXT_FIELD =
  'input:not([type="button"],[type="checkbox"],[type="color"],[type="file"],[type="hidden"],[type="image"],[type="radio"],[type="range"],[type="reset"],[type="submit"]),textarea,[contenteditable]:not([contenteditable="false"])';
const typing = () => document.activeElement?.matches(TEXT_FIELD) === true;

// The keyboard hold: while a text field has the focus the layout keeps what it showed, and a change waits for the blur and then
// `HOLD_MS` more, while the keyboard goes and the page grows back. A tablet whose browser shrinks the page for its on-screen keyboard
// would otherwise take the page under 520px while the Terminal is being typed in, and swap the desktop out (and in again once the
// keyboard is gone). The hold is in the snapshot, not in `subscribe`: React reads the snapshot on every render, so any render while
// typing (a move back changes the address) would read the new size.
const HOLD_MS = 1000;
let media: Media | null = null;
let heldUntil = 0;
function getSnapshot(): Media {
  if (media === null || (!typing() && performance.now() >= heldUntil)) media = wide() ? "wide" : "narrow";
  return media;
}
const getServerSnapshot = (): Media => "unknown";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  // A change that waited is delivered once the hold is over (if the focus went to another text field, it waits on).
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onFocusOut = (event: FocusEvent) => {
    if (!(event.target instanceof Element && event.target.matches(TEXT_FIELD))) return;
    heldUntil = performance.now() + HOLD_MS;
    clearTimeout(timer);
    // The hold ends here, whatever the clock reads: a timer may fire a hair before `heldUntil`, and the snapshot would then hold on
    // with nothing left to deliver the change.
    timer = setTimeout(() => {
      heldUntil = 0;
      onChange();
    }, HOLD_MS);
  };
  query.addEventListener("change", onChange);
  document.addEventListener("focusout", onFocusOut);
  return () => {
    clearTimeout(timer);
    query.removeEventListener("change", onChange);
    document.removeEventListener("focusout", onFocusOut);
  };
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// A boot on the page's first wide layout counts from the navigation (the prerendered boot screen was there since the first
// paint); one after the window crossed the breakpoint, from the crossing.
let firstLayout = true;

/**
 * The OS, drawn by the root so moving between its pages never remounts it. The server renders both the phone's page and the boot
 * screen and the CSS shows one; once hydrated, a wide screen loads the desktop (the boot screen meanwhile, at least `BOOT_MS`) and
 * a narrow one keeps the phone's page. A failed desktop chunk falls back to the phone's page; crossing the breakpoint swaps them,
 * unless a text field has the focus (the keyboard hold above).
 *
 * The phone's page sits outside `Crt`: `Crt` clips, which makes it a scroll container, and the page's sticky header and folder bars
 * would stick to it instead of to the viewport. It brings its own landmarks (`header`, `main`, `footer`), so the wrapper is a
 * `div` and the tube has a `main` of its own.
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
    media === "unknown" ? "unknown" : media === "narrow" || desktop === "failed" ? "phone" : off ? "off" : desktop && booted ? "desktop" : "boot";

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const route = osPage(useMatches());
  // The address follows the windows: opening a page's window (a project's Info) goes to its address, and back and forward walk them.
  const openPage = useCallback(
    (to: string) => {
      if (pathname !== to) navigate(to);
    },
    [navigate, pathname],
  );
  // Closing the window the address names (or one an open is waiting on) goes back to the desktop at `/`.
  const closePage = useCallback(() => navigate("/"), [navigate]);
  const Desktop = desktop && desktop !== "failed" ? desktop.Desktop : null;

  return (
    // The wrapper's height: one screen for the tube (the class), the content's for the phone's page, and before hydration the CSS's.
    <div data-layout={layout} className={layout === "unknown" || layout === "phone" ? undefined : "h-dvh"}>
      <style href="jelly-os-layout" precedence="default">
        {LAYOUT_CSS}
      </style>
      {(layout === "unknown" || layout === "phone") && (
        <div data-os="phone">
          <PhoneLayout route={route} />
        </div>
      )}
      {layout !== "phone" && (
        <main data-os="tube" className="h-full">
          <Crt>
            {(layout === "unknown" || layout === "boot") && <BootScreen />}
            {layout === "off" && <ShutDownScreen onRestart={restart} />}
            {layout === "desktop" && Desktop && (
              <Desktop route={route} onOpenPage={openPage} onClosePage={closePage} onRestart={restart} onShutDown={shutDown} />
            )}
          </Crt>
        </main>
      )}
    </div>
  );
}
