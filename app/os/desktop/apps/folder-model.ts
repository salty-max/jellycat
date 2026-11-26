import { nodeAt, type FsDir } from "../../../core/fs";
import { FOLDER_NAMES, FOLDERS, type Folder } from "../../../core/projects";
import type { IconName } from "../../icons/names";

/** The folders a window can show: the disk, its Projects folder, each project folder, and the Trash. */
export type FolderId = "hd" | "projects" | "trash" | Folder;

export const FOLDER_TITLES: Record<FolderId, string> = { hd: "Jelly HD", projects: "Projects", trash: "Trash", ...FOLDER_NAMES };

/** What opening an item does. */
export type Target = { type: "folder"; id: FolderId } | { type: "app"; app: "readme" | "terminal" | "lab" | "panel" } | { type: "project"; slug: string };

export type FolderItem = { key: string; name: string; icon: IconName; kind: string; target: Target };

const HD: readonly FolderItem[] = [
  { key: "projects", name: "Projects", icon: "folder", kind: "Folder", target: { type: "folder", id: "projects" } },
  { key: "readme", name: "Readme", icon: "doc", kind: "Text", target: { type: "app", app: "readme" } },
  { key: "terminal", name: "Terminal", icon: "term", kind: "Application", target: { type: "app", app: "terminal" } },
  { key: "lab", name: "Lab", icon: "lab", kind: "Application", target: { type: "app", app: "lab" } },
  { key: "panel", name: "Control Panel", icon: "panel", kind: "Application", target: { type: "app", app: "panel" } },
];

const isDir = (node: unknown): node is FsDir => (node as FsDir).kind === "dir";

/** What a folder holds, in the order the data lists it (the window's icon view). Projects and its folders read the file system (`~/projects`). */
export function folderItems(id: FolderId): readonly FolderItem[] {
  if (id === "hd") return HD;
  if (id === "trash") return [];
  const dir = nodeAt(id === "projects" ? ["projects"] : ["projects", id]);
  if (!dir || !isDir(dir)) return [];
  if (id === "projects") {
    return FOLDERS.flatMap((folder) =>
      dir.children.some((child) => child.name === folder)
        ? [{ key: folder, name: FOLDER_NAMES[folder], icon: "folder" as const, kind: "Folder", target: { type: "folder" as const, id: folder } }]
        : [],
    );
  }
  return dir.children.flatMap((node) =>
    isDir(node) && node.project
      ? [{ key: node.project.slug, name: node.project.name, icon: "app" as const, kind: node.project.kind, target: { type: "project" as const, slug: node.project.slug } }]
      : [],
  );
}

/** The list view's order: by name. */
export const byName = (items: readonly FolderItem[]) => [...items].sort((a, b) => a.name.localeCompare(b.name));
