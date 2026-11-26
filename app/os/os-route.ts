import type { Params, UIMatch } from "react-router";
import type { PageKind } from "../core/pages";

/**
 * What a route that shows the OS exports as its `handle`, naming its kind of page: the root then draws the OS (app/os/layout.tsx)
 * instead of the route's element, and the phone's page draws the route's element inside its own (app/os/phone/phone-layout.tsx).
 */
export type OsHandle = { os: true; page: PageKind };

/** An OS route's handle: `export const handle = osRoute("project")`. */
export const osRoute = (page: PageKind): OsHandle => ({ os: true, page });

/** The page the address names, as both layouts are given it: its kind, the route's parameters and its loader's data, whatever its shape. */
export type OsPage = { page: PageKind; params: Params; data: unknown };

/** Whether this match is one of the OS's pages. */
export const isOsMatch = (match: UIMatch) => (match.handle as OsHandle | undefined)?.os === true;

/** Whether the root draws the OS for these matches: the home, project and contact pages do, the not-found page doesn't. */
export const showsOs = (matches: readonly UIMatch[]) => matches.some(isOsMatch);

/** The OS page these matches name, if any. */
export function osPage(matches: readonly UIMatch[]): OsPage | undefined {
  const match = matches.find(isOsMatch);
  return match && { page: (match.handle as OsHandle).page, params: match.params, data: match.loaderData };
}
