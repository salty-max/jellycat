import type { UIMatch } from "react-router";

/** What a route that shows the OS exports as its `handle`: the root then draws the OS (app/os/layout.tsx) instead of the route's element. */
export const OS_ROUTE = { os: true } as const;

/** Whether this match is one of the OS's pages. */
export const isOsMatch = (match: UIMatch) => (match.handle as typeof OS_ROUTE | undefined)?.os === true;

/** Whether the root draws the OS for these matches: the home page and the project pages do, the not-found page doesn't. */
export const showsOs = (matches: readonly UIMatch[]) => matches.some(isOsMatch);
