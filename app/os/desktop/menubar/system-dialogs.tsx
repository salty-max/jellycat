import { useEffect } from "react";
import { OS_NAME, OS_VERSION } from "../../../core/site";
import { STUDIO_NAME } from "../../../core/studio";
import { playCue } from "../../sound/sound";
import { AlertDialog } from "../windows/alert-dialog";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container?: HTMLElement | null;
};

/** The alert's beep, as a dialog appears (it opens on a menu pick, so a click or a key has come first). */
function useBeep(open: boolean) {
  useEffect(() => {
    if (open) playCue("alert");
  }, [open]);
}

/** About: the OS's name and version, and the studio's name. */
export function AboutDialog(props: DialogProps) {
  useBeep(props.open);
  return (
    <AlertDialog {...props} title={`${OS_NAME} ${OS_VERSION}`}>
      {STUDIO_NAME}
    </AlertDialog>
  );
}

/** Shut Down... asks first; Shut Down is the default button, Cancel closes. */
export function ShutDownDialog({ onShutDown, ...props }: DialogProps & { onShutDown: () => void }) {
  useBeep(props.open);
  return (
    <AlertDialog
      {...props}
      title={`Shut down ${OS_NAME}?`}
      actions={[{ label: "Cancel" }, { label: "Shut Down", default: true, onSelect: onShutDown }]}
    />
  );
}
