import { useEffect, useRef, useState } from "react";
import type { Screenshot } from "../../core/projects";

/** Loads a picture the way `Picture` does (AVIF where the browser has it, WebP otherwise) in an element that is never shown, and decodes it. */
function decoded(shot: Screenshot): { picture: HTMLPictureElement; done: Promise<void> } {
  const picture = document.createElement("picture");
  const source = document.createElement("source");
  source.type = "image/avif";
  source.srcset = `${shot.src}.avif`;
  const img = document.createElement("img");
  picture.append(source, img);
  img.src = `${shot.src}.webp`;
  // A picture that fails to load or decode is shown by the viewer as it would have been: only the head start is lost.
  return { picture, done: typeof img.decode === "function" ? img.decode().catch(() => undefined) : Promise.resolve() };
}

/**
 * Decodes the pictures either side of `index` ahead of the step, so stepping shows the picture at once instead of a blank while
 * the browser decodes a large one. The elements are kept for as long as the viewer is mounted, so the decoded image stays in the
 * browser's cache. Returns how many neighbours are decoded (for `data-ahead`, which the e2e waits on).
 */
export function useDecodeAhead(pictures: readonly Screenshot[], index: number): number {
  const kept = useRef(new Map<number, HTMLPictureElement>());
  const [ready, setReady] = useState<ReadonlySet<number>>(new Set());
  useEffect(() => {
    for (const at of [index - 1, index + 1]) {
      const shot = pictures[at];
      if (!shot || kept.current.has(at)) continue;
      const { picture, done } = decoded(shot);
      kept.current.set(at, picture);
      // Not tied to this run of the effect: a run that was cleaned up (StrictMode, a quick step) still counts its picture.
      void done.then(() => setReady((now) => new Set(now).add(at)));
    }
  }, [pictures, index]);
  return [index - 1, index + 1].filter((at) => ready.has(at)).length;
}
