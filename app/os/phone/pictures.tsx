import type { Project } from "../../core/projects";
import { Picture } from "../viewer/picture";
import { pictureCount } from "./text";
import "./phone.css";

const SHOT_CLASS = { desktop: "ph-shot ph-desktop", phone: "ph-shot ph-phone" } as const;

/**
 * A project's screenshots, stacked in the page: a heading with the count, then each picture in its own colours in a 1px frame, with
 * its alt text as the caption. A desktop picture takes the column's width, a phone picture half of it. Pressing one opens the viewer
 * (`onOpenPicture(index, button)`). The first picture loads eagerly, since it may be in the first screen; the rest when they are near.
 */
export function PhonePictures({ project, onOpenPicture }: { project: Project; onOpenPicture: (index: number, opener: HTMLElement) => void }) {
  const shots = project.screenshots;
  if (shots.length === 0) return null;
  return (
    <section aria-labelledby="ph-shots" className="ph-shots">
      <h2 id="ph-shots" className="ph-h2">
        <span>Screenshots</span>
        <span className="text-phosphor-dim">{pictureCount(shots.length)}</span>
      </h2>
      <div className="ph-list">
        {shots.map((shot, index) => (
          <figure key={shot.src} className={SHOT_CLASS[shot.size]}>
            <button type="button" aria-haspopup="dialog" onClick={(event) => onOpenPicture(index, event.currentTarget)}>
              <Picture shot={shot} loading={index === 0 ? "eager" : "lazy"} />
            </button>
            <figcaption aria-hidden="true">{shot.alt}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
