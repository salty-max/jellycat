import { useState } from "react";
import { projectBySlug, type Screenshot } from "../../core/projects";

/** A project's pictures and the one shown. `go(±1)` stops at the ends: there the control is dim and does nothing. */
export function usePictures(slug: string) {
  const pictures: readonly Screenshot[] = projectBySlug(slug)?.screenshots ?? [];
  const [index, setIndex] = useState(0);
  const last = pictures.length - 1;
  return {
    pictures,
    index,
    shot: pictures[index],
    hasPrevious: index > 0,
    hasNext: index < last,
    go: (step: 1 | -1) => setIndex((at) => Math.max(0, Math.min(last, at + step))),
  };
}
