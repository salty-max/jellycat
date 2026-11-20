import { create } from "zustand";

export type FolderView = "icon" | "name";

type FolderViews = {
  /** Each folder window's view, by window id; a window with none is by icon. */
  views: Record<string, FolderView>;
  setView: (windowId: string, view: FolderView) => void;
};

/** How each folder window shows its items. The View menu sets it (E1); the window reads it. */
export const useFolderViews = create<FolderViews>()((set) => ({
  views: {},
  setView: (windowId, view) => set((state) => ({ views: { ...state.views, [windowId]: view } })),
}));
