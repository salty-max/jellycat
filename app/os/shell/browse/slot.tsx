import { ViewerView } from "../../viewer/viewer-view";
import type { FullScreenSlot } from "../full-screen";
import { Browse } from "./browse";

/** The host's full-screen slot: `browse` (D2) and `view` (E2). Both the phone's layout and the desktop's Terminal pass it. */
export const browseView: FullScreenSlot = (view, api) => {
  if (view.kind === "browse") return <Browse api={api} view={view} />;
  if (view.kind === "view") return <ViewerView api={api} slug={view.slug} />;
  return null;
};
