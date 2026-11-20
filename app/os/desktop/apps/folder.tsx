import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../../icons/icon";
import { useReportSelection } from "../menubar/selection";
import { useDesktop } from "./context";
import { byName, FOLDER_TITLES, folderItems, type FolderId, type FolderItem } from "./folder-model";
import { useFolderViews } from "./folder-view";
import { openTarget } from "./launch";
import "./apps.css";

/**
 * A folder window: the info line (the item count, the view) over its items, by icon or by name. One click selects, a second click or
 * a double click opens, Enter opens the focused one, the arrows move. A folder holding more than it shows scrolls.
 */
export function FolderWindow({ windowId, folder }: { windowId: string; folder: FolderId }) {
  const { openProject } = useDesktop();
  const view = useFolderViews((state) => state.views[windowId] ?? "icon");
  const items = useMemo(() => folderItems(folder), [folder]);
  const shown = useMemo(() => (view === "name" ? byName(items) : items), [items, view]);
  const [selected, setSelected] = useState<string | null>(null);
  useReportSelection(windowId, selected, () => setSelected(null));
  // Whether the click that began this click sequence is the one that selected the item (so its second click opens).
  const selectedByFirstClick = useRef(false);
  const refs = useRef(new Map<string, HTMLElement>());
  const tabStop = selected ?? shown[0]?.key;
  // The focus goes to the items when the folder opens (the window leaves it there), so the arrows and Enter work at once; only while
  // its own window has it (a deep link opens Projects and an Info window together, and the Info window keeps it).
  useEffect(() => {
    const item = tabStop ? refs.current.get(tabStop) : undefined;
    if (item?.closest('[role="dialog"]')?.contains(document.activeElement)) item.focus({ preventScroll: true });
    // On open only: later, the focus is the user's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (item: FolderItem) => openTarget(item.target, openProject);
  const select = (key: string, focus = false) => {
    setSelected(key);
    if (focus) refs.current.get(key)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) open(shown[index]);
      return;
    }
    const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
    const target = event.key === "Home" ? 0 : event.key === "End" ? shown.length - 1 : step ? index + step : -1;
    if (target < 0 || target >= shown.length) return;
    event.preventDefault();
    select(shown[target].key, true);
  };

  const props = (item: FolderItem, index: number) => {
    const on = selected === item.key;
    return {
      key: item.key,
      ref: (node: HTMLElement | null) => {
        if (node) refs.current.set(item.key, node);
        else refs.current.delete(item.key);
      },
      role: "option" as const,
      "aria-selected": on,
      "data-selected": on,
      tabIndex: item.key === tabStop ? 0 : -1,
      onKeyDown: (event: KeyboardEvent) => onKeyDown(event, index),
      onClick: (event: React.MouseEvent) => {
        // The surface's rule: a click selects, a click on the one selected opens; a double click is that second click.
        if (event.detail >= 3) return;
        if (event.detail === 2) {
          if (selectedByFirstClick.current) open(item);
          selectedByFirstClick.current = false;
          return;
        }
        selectedByFirstClick.current = !on;
        if (on) open(item);
        else select(item.key);
      },
    };
  };

  return (
    <div className="app-pane">
      <div className="app-info">
        <span>{`${items.length} item${items.length === 1 ? "" : "s"}`}</span>
        <span>{view === "icon" ? "by icon" : "by name"}</span>
      </div>
      <div className="app-scroll" onClick={(event) => event.target === event.currentTarget && setSelected(null)}>
        {items.length === 0 ? (
          <p className="app-dim m-0">No items</p>
        ) : view === "icon" ? (
          <div role="listbox" aria-label={FOLDER_TITLES[folder]} className="app-grid">
            {shown.map((item, index) => {
              const { key, ...rest } = props(item, index);
              return (
                <div key={key} {...rest} className="app-item">
                  <Icon name={item.icon} inverted={selected === item.key} />
                  <span>{item.name}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="app-head" aria-hidden="true">
              <span>Name</span>
              <span>Kind</span>
            </div>
            <div role="listbox" aria-label={FOLDER_TITLES[folder]}>
              {shown.map((item, index) => {
                const { key, ...rest } = props(item, index);
                return (
                  <div key={key} {...rest} className="app-row">
                    <span>
                      <Icon name={item.icon} scale={1} inverted={selected === item.key} />
                      {item.name}
                    </span>
                    <span>{item.kind}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
