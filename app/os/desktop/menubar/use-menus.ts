import { PHOSPHORS, useSettings, type Phosphor } from "../../../core/settings";
import { OS_NAME } from "../../../core/site";
import { useDesktop } from "../apps/context";
import { folderItems, type FolderId, type Target } from "../apps/folder-model";
import { useFolderViews, type FolderView } from "../apps/folder-view";
import { ICON_TARGETS, openControlPanel, openTarget } from "../apps/launch";
import { selectActive, useWindows } from "../windows/store";
import { useSelection, type Selected } from "./selection";

/** One line of a drop-down. A dim item is `disabled`; a checked one is a check or a radio. */
export type Entry =
  | { type: "separator" }
  | { type: "item"; label: string; disabled?: boolean; onSelect: () => void }
  | { type: "check"; label: string; checked: boolean; onToggle: () => void }
  | {
      type: "radio";
      value: string;
      options: readonly { value: string; label: string }[];
      disabled?: boolean;
      onChange: (value: string) => void;
    };

export type MenuDef = { id: string; label: string; entries: readonly Entry[] };

const PHOSPHOR_LABELS: Record<Phosphor, string> = {
  green: "Green phosphor",
  amber: "Amber phosphor",
  white: "White phosphor",
};
const SEPARATOR: Entry = { type: "separator" };

/** What the selected icon or item opens, or null when nothing is selected (or its window is gone). */
export function selectedTarget(selected: Selected | null, windows: ReturnType<typeof useWindows.getState>["windows"]): Target | null {
  if (!selected) return null;
  if (selected.owner === "desktop") return ICON_TARGETS[selected.key] ?? null;
  const win = windows[selected.owner];
  if (!win || win.app !== "folder") return null;
  return folderItems(win.props.folder as FolderId).find((item) => item.key === selected.key)?.target ?? null;
}

export type Host = { about: () => void; restart: () => void; shutDown: () => void };

/** The menus as data, read from the stores they act on. */
export function useMenus({ about, restart, shutDown }: Host): {
  cat: MenuDef;
  menus: MenuDef[];
} {
  const { openProject } = useDesktop();
  const selected = useSelection((state) => state.selected);
  const windows = useWindows((state) => state.windows);
  const active = useWindows(selectActive);
  const views = useFolderViews((state) => state.views);
  const setView = useFolderViews((state) => state.setView);
  const settings = useSettings();

  const target = selectedTarget(selected, windows);
  const front = active ? windows[active] : undefined;
  const folderFront = front?.app === "folder" ? front : undefined;
  const effects = settings.scanlines || settings.glow || settings.flicker;

  const cat: MenuDef = {
    id: "cat",
    label: OS_NAME,
    entries: [
      { type: "item", label: `About ${OS_NAME}`, onSelect: about },
      SEPARATOR,
      { type: "item", label: "Control Panel", onSelect: openControlPanel },
    ],
  };

  const file: MenuDef = {
    id: "file",
    label: "File",
    entries: [
      {
        type: "item",
        label: "Open",
        disabled: !target,
        onSelect: () => target && openTarget(target, openProject),
      },
      {
        type: "item",
        label: "Get Info",
        disabled: target?.type !== "project",
        onSelect: () => target?.type === "project" && openProject(target.slug),
      },
      SEPARATOR,
      {
        type: "item",
        label: "Close Window",
        disabled: !active,
        onSelect: () => active && useWindows.getState().close(active),
      },
    ],
  };

  const edit: MenuDef = {
    id: "edit",
    label: "Edit",
    entries: [
      { type: "item", label: "Undo", disabled: true, onSelect: () => {} },
      SEPARATOR,
      { type: "item", label: "Cut", disabled: true, onSelect: () => {} },
      { type: "item", label: "Copy", disabled: true, onSelect: () => {} },
      { type: "item", label: "Paste", disabled: true, onSelect: () => {} },
    ],
  };

  const view: MenuDef = {
    id: "view",
    label: "View",
    entries: [
      {
        type: "radio",
        value: folderFront ? (views[folderFront.id] ?? "icon") : "",
        disabled: !folderFront,
        options: [
          { value: "icon", label: "by Icon" },
          { value: "name", label: "by Name" },
        ],
        onChange: (value) => folderFront && setView(folderFront.id, value as FolderView),
      },
    ],
  };

  const special: MenuDef = {
    id: "special",
    label: "Special",
    entries: [
      {
        type: "radio",
        value: settings.phosphor,
        options: PHOSPHORS.map((value) => ({
          value,
          label: PHOSPHOR_LABELS[value],
        })),
        onChange: (value) => settings.set("phosphor", value as Phosphor),
      },
      SEPARATOR,
      {
        type: "check",
        label: "CRT effects",
        checked: effects,
        // The mockup's switch: none on turns scanlines and glow on (flicker stays as the Control Panel has it); any on turns all off.
        onToggle: () => {
          const on = !effects;
          settings.set("scanlines", on);
          settings.set("glow", on);
          if (!on) settings.set("flicker", false);
        },
      },
      {
        type: "check",
        label: "Dither pattern",
        checked: settings.dither,
        onToggle: () => settings.set("dither", !settings.dither),
      },
      SEPARATOR,
      { type: "item", label: "Restart", onSelect: restart },
      { type: "item", label: "Shut Down...", onSelect: shutDown },
    ],
  };

  const open = Object.values(windows).sort((a, b) => a.seq - b.seq);
  const windowMenu: MenuDef = {
    id: "window",
    label: "Window",
    entries: open.length
      ? [
          {
            type: "radio",
            value: active ?? "",
            options: open.map((win) => ({ value: win.id, label: win.title })),
            onChange: (id) => useWindows.getState().focus(id),
          },
        ]
      : [
          {
            type: "item",
            label: "No windows",
            disabled: true,
            onSelect: () => {},
          },
        ],
  };

  return { cat, menus: [file, edit, view, special, windowMenu] };
}
