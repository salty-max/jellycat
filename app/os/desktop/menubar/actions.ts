import { useFolderViews } from "../apps/folder-view";
import { useWindows } from "../windows/store";

/** Closes every window and starts the next session from scratch (Projects opens again, as it does at boot); the desktop's size stays. */
export function closeAllWindows() {
  const { desk } = useWindows.getState();
  useWindows.setState({ ...useWindows.getInitialState(), desk }, true);
  useFolderViews.setState({ views: {} });
}
