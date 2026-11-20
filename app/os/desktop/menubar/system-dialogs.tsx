import { OS_NAME, OS_VERSION } from "../../../core/site";
import { STUDIO_NAME } from "../../../core/studio";
import { AlertDialog } from "../windows/alert-dialog";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container?: HTMLElement | null;
};

/** About: the OS's name and version, and the studio's name. */
export function AboutDialog(props: DialogProps) {
  return (
    <AlertDialog {...props} title={`${OS_NAME} ${OS_VERSION}`}>
      {STUDIO_NAME}
    </AlertDialog>
  );
}

/** Shut Down... asks first; Shut Down is the default button, Cancel closes. */
export function ShutDownDialog({ onShutDown, ...props }: DialogProps & { onShutDown: () => void }) {
  return (
    <AlertDialog
      {...props}
      title={`Shut down ${OS_NAME}?`}
      actions={[{ label: "Cancel" }, { label: "Shut Down", default: true, onSelect: onShutDown }]}
    />
  );
}
