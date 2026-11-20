import type { FullScreenSlot } from "./shell/full-screen";
import { Browse } from "./shell/browse/browse";
import { ViewerView } from "./viewer/viewer-view";

/** The host's full-screen slot: `browse` (D2) and `view` (E2). Both the phone's layout and the desktop's Terminal pass it. */
export const fullScreenViews: FullScreenSlot = (view, api) => {
  if (view.kind === "browse") return <Browse api={api} view={view} />;
  if (view.kind === "view") return <ViewerView api={api} slug={view.slug} />;
  return null;
};
