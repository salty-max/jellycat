import type { FullScreenSlot } from "../full-screen";
import { Browse } from "./browse";

/** The host's full-screen slot for `browse`: a view that isn't `browse` is left to the next one (the viewer) or the placeholder. */
export const browseView: FullScreenSlot = (view, api) => (view.kind === "browse" ? <Browse api={api} view={view} /> : null);
