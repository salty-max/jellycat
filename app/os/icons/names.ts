import { GLYPH_GRIDS, ICON_GRIDS } from "./grids";

export type IconName = keyof typeof ICON_GRIDS;
export type GlyphName = keyof typeof GLYPH_GRIDS;
export const ICON_NAMES = Object.keys(ICON_GRIDS) as IconName[];
export const GLYPH_NAMES = Object.keys(GLYPH_GRIDS) as GlyphName[];

// The Tools folder (addon-kit, wow-data, harness) has no art of its own: it is the folder icon, as web, addons and engines are.
export const FOLDER_ICONS = { web: "folder", addons: "folder", engines: "folder", tools: "folder" } as const satisfies Record<string, IconName>;
