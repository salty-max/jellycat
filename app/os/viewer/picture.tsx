import type { Screenshot } from "../../core/projects";

/**
 * A screenshot in its own colours (the CRT layer sits over it): AVIF where the browser has it, WebP otherwise, with its size set so
 * the box doesn't jump, and loaded when it is near. The alt text is the caption, so the picture keeps it for screen readers.
 */
export function Picture({ shot, className }: { shot: Screenshot; className?: string }) {
  return (
    <picture>
      <source type="image/avif" srcSet={`${shot.src}.avif`} />
      <img className={className} src={`${shot.src}.webp`} width={shot.width} height={shot.height} alt={shot.alt} loading="lazy" decoding="async" />
    </picture>
  );
}
