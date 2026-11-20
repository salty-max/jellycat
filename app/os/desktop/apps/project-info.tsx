import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { projectBySlug } from "../../../core/projects";
import { Icon } from "../../icons/icon";
import { useWindows } from "../windows/store";
import { openProjectReadme, openViewer } from "./launch";
import "./apps.css";

const host = (url: string) => url.replace(/^https?:\/\//, "");
const address = (url: string) =>
  url === "-" ? (
    "-"
  ) : (
    <a href={url} target="_blank" rel="noopener">
      {host(url)}
    </a>
  );

// The window's frame around its body: the two 1px borders, the 22px title bar and the body's 10px padding above and below.
const CHROME = 2 + 22 + 20;
const MARGIN = 8;

/**
 * A project's Info window: its icon, name and kind; Stack, Link, Source and Screenshots; the description; and Open Readme, the
 * default button, which Enter presses too. The window is as tall as this is, so the app sets it once drawn.
 */
export function ProjectInfo({ windowId, slug }: { windowId: string; slug: string }) {
  const project = projectBySlug(slug);
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = root.current;
    const { windows, desk, resizeTo, moveTo } = useWindows.getState();
    const win = windows[windowId];
    if (!element || !win) return;
    const height = element.offsetHeight + CHROME;
    resizeTo(windowId, win.w, height);
    if (win.y + height > desk.h - MARGIN) moveTo(windowId, win.x, Math.max(0, desk.h - height - MARGIN));
    // Focus on the sheet itself, so Enter reaches it without a button taking it (the window's own focus would sit outside).
    element.focus({ preventScroll: true });
  }, [windowId]);

  if (!project) return null;
  const pictures = project.screenshots.length;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" || (event.target as HTMLElement).closest("button, a")) return;
    event.preventDefault();
    openProjectReadme(slug);
  };

  return (
    <div ref={root} className="app-sheet" tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="app-ihead">
        <Icon name="app" />
        <div className="app-head-text">
          <p>{project.name}</p>
          <p className="app-dim">{project.kind}</p>
        </div>
      </div>
      <div className="app-rule" />
      <div className="app-kv">
        <span className="app-dim">Stack</span>
        <span>{project.stack}</span>
        <span className="app-dim">Link</span>
        <span>{address(project.link)}</span>
        <span className="app-dim">Source</span>
        <span>{address(project.source)}</span>
        {pictures > 0 && (
          <>
            <span className="app-dim app-center">Screenshots</span>
            <span className="app-pics">
              {`${pictures} picture${pictures === 1 ? "" : "s"}`}
              <button type="button" className="app-button" onClick={() => openViewer(slug)}>
                View
              </button>
            </span>
          </>
        )}
      </div>
      <div className="app-rule" />
      <p>{project.description}</p>
      <div className="app-actions">
        <button type="button" className="app-button" data-default="" onClick={() => openProjectReadme(slug)}>
          Open Readme
        </button>
      </div>
    </div>
  );
}
