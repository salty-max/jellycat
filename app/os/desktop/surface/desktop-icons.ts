import type { IconName } from "../../icons/names";

export type DesktopIcon = { id: string; label: string; icon: IconName };

/** The icons on the desktop, top to bottom, as the mockup lists them. Trash stands apart at the bottom of the column. */
export const DESKTOP_ICONS: readonly DesktopIcon[] = [
  { id: "hd", label: "Jelly HD", icon: "disk" },
  { id: "projects", label: "Projects", icon: "folder" },
  { id: "readme", label: "Readme", icon: "doc" },
  { id: "terminal", label: "Terminal", icon: "term" },
  { id: "lab", label: "Lab", icon: "lab" },
  { id: "trash", label: "Trash", icon: "trash" },
];
