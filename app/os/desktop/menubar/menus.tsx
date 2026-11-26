import { Menu } from "@base-ui/react/menu";
import { Menubar } from "@base-ui/react/menubar";
import { useRef, useState, type ReactNode } from "react";
import { Icon } from "../../icons/icon";
import { closeAllWindows } from "./actions";
import "./menubar.css";
import { AboutDialog, ShutDownDialog } from "./system-dialogs";
import { OS_NAME } from "../../../core/site";
import { playCue } from "../../sound/sound";
import { useMenus, type Entry, type Host } from "./use-menus";

const MENU_LABELS = [
  ["file", "File"],
  ["edit", "Edit"],
  ["view", "View"],
  ["special", "Special"],
  ["window", "Window"],
] as const;

function Items({ entries }: { entries: readonly Entry[] }) {
  return entries.map((entry, index) => {
    switch (entry.type) {
      case "separator":
        return <Menu.Separator key={index} className="menubar-separator" />;
      case "item":
        return (
          <Menu.Item key={index} className="menubar-item" disabled={entry.disabled} onClick={entry.onSelect}>
            {entry.label}
          </Menu.Item>
        );
      case "check":
        return (
          <Menu.CheckboxItem key={index} className="menubar-item" checked={entry.checked} onCheckedChange={entry.onToggle} closeOnClick>
            {entry.checked ? <span aria-hidden="true" className="menubar-mark" /> : null}
            {entry.label}
          </Menu.CheckboxItem>
        );
      case "radio":
        return (
          <Menu.RadioGroup key={index} value={entry.value} onValueChange={(value) => entry.onChange(value as string)}>
            {entry.options.map((option) => (
              <Menu.RadioItem key={option.value} value={option.value} className="menubar-item" disabled={entry.disabled} closeOnClick>
                {entry.value === option.value ? <span aria-hidden="true" className="menubar-mark" /> : null}
                {option.label}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        );
    }
  });
}

/** The drop-down's lines. It reads the stores, so it lives inside the popup: a closed menu follows nothing. */
function Entries({ id, host }: { id: string; host: Host }) {
  const { cat, menus } = useMenus(host);
  const def = id === cat.id ? cat : menus.find((each) => each.id === id);
  return def ? <Items entries={def.entries} /> : null;
}

function MenuView({
  id,
  label,
  host,
  container,
  trigger,
  onClosed,
}: {
  id: string;
  label: string;
  host: Host;
  container?: HTMLElement | null;
  trigger?: (open: boolean) => ReactNode;
  onClosed: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Menu.Root onOpenChange={setOpen} onOpenChangeComplete={(isOpen) => !isOpen && onClosed()}>
      <Menu.Trigger className="menubar-trigger" aria-label={trigger ? label : undefined}>
        {trigger ? trigger(open) : label}
      </Menu.Trigger>
      <Menu.Portal container={container}>
        <Menu.Positioner className="menubar-positioner" align="start" sideOffset={0} alignOffset={0}>
          <Menu.Popup className="menubar-popup">
            <Entries id={id} host={host} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export type SystemMenusProps = {
  /** Where the drop-downs are drawn: a positioned box, held in state so it is set before one opens. */
  container?: HTMLElement | null;
  /** Where the dialogs are drawn (the desktop's box, below the bar). */
  dialogContainer?: HTMLElement | null;
  /** Restart: every window closes, then the host shows the boot screen again. */
  onRestart?: () => void;
  /** Shut Down, once confirmed: every window closes, then the host shows the shut-down screen. */
  onShutDown?: () => void;
};

/** The menu bar's menus (cat, File, Edit, View, Special, Window) and the dialogs they open (About, Shut Down). */
export function SystemMenus({ container, dialogContainer, onRestart, onShutDown }: SystemMenusProps) {
  const [dialog, setDialog] = useState<"about" | "shutdown" | null>(null);
  // A dialog opens once the menu that picked it has closed: closing hands the focus back to the menu's trigger, and doing that after the
  // dialog took it would leave Enter with nothing to press.
  const pending = useRef<"about" | "shutdown" | null>(null);
  const flush = () => {
    if (pending.current) setDialog(pending.current);
    pending.current = null;
  };
  const host: Host = {
    about: () => (pending.current = "about"),
    shutDown: () => (pending.current = "shutdown"),
    restart: () => {
      playCue("up");
      closeAllWindows();
      onRestart?.();
    },
  };
  return (
    <>
      <Menubar modal={false} className="menubar-bar">
        <MenuView
          id="cat"
          label={OS_NAME}
          host={host}
          container={container}
          onClosed={flush}
          trigger={(open) => <Icon name="cat" scale={1} inverted={open} />}
        />
        {MENU_LABELS.map(([id, label]) => (
          <MenuView key={id} id={id} label={label} host={host} container={container} onClosed={flush} />
        ))}
      </Menubar>
      <AboutDialog open={dialog === "about"} onOpenChange={(open) => !open && setDialog(null)} container={dialogContainer} />
      <ShutDownDialog
        open={dialog === "shutdown"}
        onOpenChange={(open) => !open && setDialog(null)}
        container={dialogContainer}
        onShutDown={() => {
          playCue("down");
          closeAllWindows();
          onShutDown?.();
        }}
      />
    </>
  );
}
