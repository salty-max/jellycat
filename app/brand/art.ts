import artwork from "../../branding/source/mark.json" with { type: "json" };

export const BRAND_MARK = artwork;

/** The same approved paths for exported assets and server-rendered link previews. */
export function brandSvg({ ink, counter, width = 32, height = width }: { ink: string; counter?: string; width?: number; height?: number }): string {
  const inside = counter ? `<path fill="${counter}" d="${artwork.silhouette}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${artwork.viewBox}">${inside}<path fill="${ink}" fill-rule="evenodd" d="${artwork.foreground}"/></svg>`;
}
