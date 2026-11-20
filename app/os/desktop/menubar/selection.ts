import { useEffect, useRef } from "react";
import { create } from "zustand";

/** The icon or item File's Open and Get Info act on: `owner` is "desktop" or a folder window's id, `key` the icon's or the item's. */
export type Selected = { owner: string; key: string };

type SelectionState = {
  selected: Selected | null;
  /** One selection for the whole desktop, as the mockup keeps: the last one made. A null from an owner that doesn't hold it changes nothing. */
  report: (owner: string, key: string | null) => void;
};

export const useSelection = create<SelectionState>()((set) => ({
  selected: null,
  report: (owner, key) =>
    set((state) => {
      if (key !== null) return state.selected?.owner === owner && state.selected.key === key ? state : { selected: { owner, key } };
      return state.selected?.owner === owner ? { selected: null } : state;
    }),
}));

/** What the surface and the folder windows call with their own selection, so the menus can act on it. It clears when the owner goes. */
export function useReportSelection(owner: string, key: string | null, clear: () => void) {
  const latest = useRef({ key, clear });
  useEffect(() => {
    latest.current = { key, clear };
  });
  useEffect(() => {
    useSelection.getState().report(owner, key);
  }, [owner, key]);
  // One selection on the whole desktop: when another owner takes it, this one drops its highlight.
  useEffect(
    () =>
      useSelection.subscribe((state) => {
        if (state.selected?.owner !== owner && latest.current.key !== null) latest.current.clear();
      }),
    [owner],
  );
  useEffect(() => () => useSelection.getState().report(owner, null), [owner]);
}
