import { GLYPH_GRIDS, ICON_GRIDS } from "./grids";

import type { GlyphName, IconName } from "./names";

type Grid = readonly string[];

// One <path> of unit squares for every cell that holds `mark`. Each cell is drawn on its own (no merging), so the shapes stay on
// the pixel grid and the SVG renders the same at any scale.
function cells(grid: Grid, mark: string): string {
  let d = "";
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === mark) d += `M${x} ${y}h1v1h-1z`;
  });
  return d;
}

type PixelProps = {
  grid: Grid;
  size: number;
  /** The grid's side in cells: 16 for an icon, 8 for a title-bar glyph. */
  cells: number;
  /** Outline in the tube's black and the inside in the phosphor, for a selected icon. */
  inverted?: boolean;
  className?: string;
};

function Pixels({ grid, size, cells: side, inverted = false, className }: PixelProps) {
  const outline = inverted ? "var(--phosphor-bg)" : "currentColor";
  const inside = inverted ? "currentColor" : "var(--phosphor-bg)";
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox={`0 0 ${side} ${side}`}
      shapeRendering="crispEdges"
      className={className}
      style={{ display: "block", flex: "none" }}
    >
      <path d={cells(grid, "o")} fill={inside} />
      <path d={cells(grid, "#")} fill={outline} />
    </svg>
  );
}

type IconProps = { inverted?: boolean; className?: string };

/** A 16×16 icon. `scale` 2 (32px) on the desktop and in folders, 1 (16px) in lists and menus. Decorative: the label next to it names it. */
export function Icon({ name, scale = 2, ...rest }: IconProps & { name: IconName; scale?: 1 | 2 }) {
  return <Pixels grid={ICON_GRIDS[name]} size={16 * scale} cells={16} {...rest} />;
}

/** An 8×8 title-bar glyph (close, collapse, zoom, arrows), at 1× or 2×. */
export function Glyph({ name, scale = 1, ...rest }: IconProps & { name: GlyphName; scale?: 1 | 2 }) {
  return <Pixels grid={GLYPH_GRIDS[name]} size={8 * scale} cells={8} {...rest} />;
}

export const DiskIcon = (props: IconProps & { scale?: 1 | 2 }) => <Icon name="disk" {...props} />;
export const FolderIcon = (props: IconProps & { scale?: 1 | 2 }) => <Icon name="folder" {...props} />;
export const DocIcon = (props: IconProps & { scale?: 1 | 2 }) => <Icon name="doc" {...props} />;
export const TermIcon = (props: IconProps & { scale?: 1 | 2 }) => <Icon name="term" {...props} />;
export const TrashIcon = (props: IconProps & { scale?: 1 | 2 }) => <Icon name="trash" {...props} />;
export const PanelIcon = (props: IconProps & { scale?: 1 | 2 }) => <Icon name="panel" {...props} />;
export const CatIcon = (props: IconProps & { scale?: 1 | 2 }) => <Icon name="cat" {...props} />;
export const AppIcon = (props: IconProps & { scale?: 1 | 2 }) => <Icon name="app" {...props} />;
