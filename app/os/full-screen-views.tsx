import type { FullScreenSlot } from "./shell/full-screen";
import { Browse } from "./shell/browse/browse";

/** The host's full-screen slot: `browse` (D2), which the desktop's Terminal passes. */
export const fullScreenViews: FullScreenSlot = (view, api) => <Browse api={api} view={view} />;
