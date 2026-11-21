import type { MouseEvent } from "react";

/** A plain click is the page's; a click with a modifier (a new tab, a copy of the address) is the browser's. */
export const plainClick = (event: MouseEvent) => !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);
