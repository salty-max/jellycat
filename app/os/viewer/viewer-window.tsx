import { useEffect, useRef, type KeyboardEvent } from "react";
import { projectBySlug } from "../../core/projects";
import { Glyph } from "../icons/icon";
import { useWindows } from "../desktop/windows/store";
import { Picture } from "./picture";
import { usePictures } from "./use-pictures";
import "./viewer.css";

/**
 * The screenshot viewer's window: the count in the info line, the picture scaled to fit a box that doesn't move, its caption (the alt
 * text, two lines at most) and the previous and next buttons, dim at the ends. ← and → step, Esc closes.
 */
export function ViewerWindow({ windowId, slug }: { windowId: string; slug: string }) {
  const { pictures, index, shot, hasPrevious, hasNext, go } = usePictures(slug);
  const root = useRef<HTMLDivElement>(null);
  // On mount, and on a second open of this window (the store counts it in `entered`): the keys are the root's, so it takes the focus.
  const entered = useWindows((state) => (state.entered?.id === windowId ? state.entered.n : 0));
  useEffect(() => root.current?.focus({ preventScroll: true }), [entered]);
  // A button that goes dim while it has the focus hands the focus to the window, so the keys keep working.
  useEffect(() => {
    if (!hasPrevious || !hasNext) {
      const active = document.activeElement;
      if (active instanceof HTMLButtonElement && active.disabled) root.current?.focus({ preventScroll: true });
    }
  }, [hasPrevious, hasNext]);

  if (!projectBySlug(slug) || !shot) return null;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") go(-1);
    else if (event.key === "ArrowRight") go(1);
    else if (event.key === "Escape") useWindows.getState().close(windowId);
    else return;
    event.preventDefault();
  };

  return (
    <div ref={root} className="app-pane vw" tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="app-info">
        <span>{`${index + 1} of ${pictures.length}`}</span>
      </div>
      <figure className="vw-shot">
        <div className="vw-box">
          <Picture shot={shot} />
        </div>
        <div className="vw-bar">
          <figcaption className="vw-cap" aria-hidden="true">
            {shot.alt}
          </figcaption>
          <span className="vw-nav">
            <button type="button" className="app-button vw-btn" aria-label="Previous picture" disabled={!hasPrevious} onClick={() => go(-1)}>
              <Glyph name="prev" />
            </button>
            <button type="button" className="app-button vw-btn" aria-label="Next picture" disabled={!hasNext} onClick={() => go(1)}>
              <Glyph name="next" />
            </button>
          </span>
        </div>
      </figure>
    </div>
  );
}
