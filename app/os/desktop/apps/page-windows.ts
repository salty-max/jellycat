import type { PageKind } from "../../../core/pages";
import { ids, openContact, openInfo } from "./launch";

/** The window an address opens on the desktop. */
export type PageWindow = {
  /** The window's id: the address names this window, and closing it goes back to `/`. */
  id: string;
  /** Opens it, or brings it to the front if it is open. */
  open: () => void;
};

/** The address's parameters, as the route matched them (`slug` for a project). */
type Params = Readonly<Record<string, string | undefined>>;

/** What each kind of page opens on the desktop, over Projects. The home page opens nothing. */
const PAGE_WINDOWS: Record<PageKind, (params: Params) => PageWindow | undefined> = {
  home: () => undefined,
  project: ({ slug }) => (slug ? { id: ids.info(slug), open: () => openInfo(slug) } : undefined),
  contact: () => ({ id: ids.contact, open: openContact }),
};

/** The window this page opens, if any. */
export const pageWindow = (page: PageKind, params: Params) => PAGE_WINDOWS[page](params);

/**
 * Whether a move to another address closes this window: a project's Info window goes when the address leaves its project, as a page
 * would. Every other window stays open with what it holds (the Lab's program, a half-typed message in Contact).
 */
export const closesOnMove = (id: string) => id.startsWith(ids.info(""));
