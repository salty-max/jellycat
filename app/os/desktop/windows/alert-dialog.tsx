import { AlertDialog as Base } from "@base-ui/react/alert-dialog";
import { useRef, type ReactNode } from "react";

import { Icon } from "../../icons/icon";
import type { IconName } from "../../icons/names";
import "./windows.css";

export type AlertAction = {
  label: string;
  onSelect?: () => void;
  /** The button Enter presses: it has the focus and a second outline. One per dialog. */
  default?: boolean;
};

type AlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The message's first line, which names the dialog. */
  title: string;
  /** Further lines, dim. */
  children?: ReactNode;
  icon?: IconName;
  /** Left to right. Every action closes the dialog after its `onSelect`. */
  actions?: AlertAction[];
  /** The desktop's box (a positioned element, held in state so it is set before the dialog opens), so the dialog sits over the desktop. Without it the dialog fills the page. */
  container?: HTMLElement | null;
};

const OK: AlertAction[] = [{ label: "OK", default: true }];

/**
 * A modal alert on Base UI's AlertDialog: a 3px double border, no title bar, the icon beside the message, and the default button with
 * a second outline. Focus is trapped inside, goes to the default button, and returns to what opened it.
 */
export function AlertDialog({ open, onOpenChange, title, children, icon = "cat", actions = OK, container }: AlertDialogProps) {
  const defaultButton = useRef<HTMLButtonElement>(null);
  return (
    <Base.Root open={open} onOpenChange={onOpenChange}>
      <Base.Portal container={container}>
        <Base.Viewport className="alert-layer" data-fixed={container ? undefined : ""}>
          <Base.Popup className="alert" initialFocus={defaultButton}>
            <div className="alert-message">
              <Icon name={icon} />
              <div>
                <Base.Title render={<p />} className="alert-title">
                  {title}
                </Base.Title>
                {children ? <Base.Description render={<div />} className="alert-text">{children}</Base.Description> : null}
              </div>
            </div>
            <div className="alert-actions">
              {actions.map((action, index) => (
                <Base.Close
                  key={index}
                  ref={action.default ? defaultButton : undefined}
                  className="alert-button"
                  data-default={action.default || undefined}
                  onClick={action.onSelect}
                >
                  {action.label}
                </Base.Close>
              ))}
            </div>
          </Base.Popup>
        </Base.Viewport>
      </Base.Portal>
    </Base.Root>
  );
}
