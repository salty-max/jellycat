import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { projectBySlug } from "../../core/projects";
import { Glyph } from "../icons/icon";
import { Picture } from "../viewer/picture";
import { useDecodeAhead } from "../viewer/use-decode-ahead";
import { usePictures } from "../viewer/use-pictures";
import { Dialog } from "./dialog";

/** A sideways move of at least this many pixels, further across than down, is a swipe. */
const SWIPE = 40;

/**
 * The phone's screenshot viewer: a full-screen modal dialog named for the project. The name and the count (`2 of 3`) are set in the
 * pane's double border, the picture is shown whole with its caption under it, and three buttons follow: Previous and Next (dim at the
 * ends) and Close. A swipe on the picture and ← → step; Esc, Android's back gesture and Close call `onClose`, which unmounts it.
 * The pictures either side of the one shown are decoded ahead, so a step shows the next at once. `start` is the index of the picture that opened it, and `returnFocus` that picture, which takes the focus back.
 */
export function PhoneViewer({ slug, start, onClose, returnFocus }: { slug: string; start: number; onClose: () => void; returnFocus?: HTMLElement | null }) {
  const { pictures, index, shot, hasPrevious, hasNext, go } = usePictures(slug, start);
  const ahead = useDecodeAhead(pictures, index);
  const project = projectBySlug(slug);
  // Where a finger went down on the picture, until it comes up or the browser takes the gesture for a scroll.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  if (!project || !shot) return null;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") go(-1);
    else if (event.key === "ArrowRight") go(1);
    else return;
    event.preventDefault();
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // One finger, or the mouse's main button: a second finger is a pinch, which the browser takes for a zoom.
    if (!event.isPrimary || event.button !== 0) return;
    swipe.current = { x: event.clientX, y: event.clientY };
    // The up may land outside the box: keep the gesture's events here.
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from) return;
    const dx = event.clientX - from.x;
    if (Math.abs(dx) >= SWIPE && Math.abs(dx) > Math.abs(event.clientY - from.y)) go(dx < 0 ? 1 : -1);
  };
  const step = (by: 1 | -1, enabled: boolean) => () => {
    if (enabled) go(by);
  };

  return (
    <Dialog onClose={onClose} label={`${project.name} screenshots`} initialFocus="[data-close]" returnFocus={returnFocus} onKeyDown={onKeyDown} className="dlg-viewer">
      <figure className="dlg-pane">
        <div className="dlg-pt">
          <span>{project.name}</span>
          <span role="status">{`${index + 1} of ${pictures.length}`}</span>
        </div>
        <div className="dlg-box" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)} onDragStart={(event) => event.preventDefault()} data-ahead={ahead}>
          <Picture shot={shot} />
        </div>
        <figcaption className="dlg-cap" aria-hidden="true">
          {shot.alt}
        </figcaption>
      </figure>
      <div className="dlg-btns">
        <button type="button" className="dlg-btn" aria-disabled={!hasPrevious} onClick={step(-1, hasPrevious)}>
          <Glyph name="prev" scale={2} />
          Previous
        </button>
        <button type="button" className="dlg-btn" aria-disabled={!hasNext} onClick={step(1, hasNext)}>
          Next
          <Glyph name="next" scale={2} />
        </button>
        <button type="button" className="dlg-btn" data-close="" onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  );
}
