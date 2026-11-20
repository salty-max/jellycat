import type { ReactNode } from "react";
import type { PageSource } from "../../core/shell";

/** A view that takes the whole screen. The pager is the shell's own; `browse` and the screenshot viewer are the host's. */
export type FullScreenView = { kind: "browse" } | { kind: "view"; slug: string };

/** Returns true when the key was used: the shell then keeps it from the prompt behind. */
export type KeyHandler = (key: string) => boolean;

/** What a full-screen view gets from the shell. */
export interface FullScreenApi {
  /** Goes back to where the view was opened: the prompt, or the view that paged. */
  close: () => void;
  /** Pages a file in front of this view; `q` there comes back to this view. The view is unmounted meanwhile, so it keeps its state (selection, scroll) where it can be restored, outside the component. */
  page: (path: string, source: PageSource) => void;
  /** Sends this view every key typed while it is in front, until the returned function is called. */
  onKey: (handler: KeyHandler) => () => void;
}

/** The host's full-screen views: `browse` (D2) and the viewer (E2). Without one, the shell shows a placeholder. */
export type FullScreenSlot = (view: FullScreenView, api: FullScreenApi) => ReactNode;
