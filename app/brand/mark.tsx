import { BRAND_MARK } from "./art";

/** Decorative brand mark; its adjacent label names the studio. Counters stay opaque over the desktop dither. */
export function BrandMark({ size = 32, inverted = false, className }: { size?: number; inverted?: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox={BRAND_MARK.viewBox}
      shapeRendering="crispEdges"
      className={className}
      data-brand-mark="jellycat"
      style={{ display: "block", flex: "none" }}
    >
      <path d={BRAND_MARK.silhouette} fill={inverted ? "currentColor" : "var(--phosphor-bg)"} />
      <path d={BRAND_MARK.foreground} fill={inverted ? "var(--phosphor-bg)" : "currentColor"} fillRule="evenodd" />
    </svg>
  );
}
