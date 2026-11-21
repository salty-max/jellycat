import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import "./dialogs.css";

// The page behind a modal dialog doesn't scroll: the root is locked while any dialog is open, and gives the scroll bar's width back
// as padding so a page with a visible bar (a narrow desktop window) doesn't shift. A phone's bars overlay the page and take none.
let locks = 0;
let saved: { overflow: string; paddingRight: string } | null = null;
function lockScroll(): () => void {
  const root = document.documentElement;
  if (locks++ === 0) {
    saved = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
    const bar = window.innerWidth - root.clientWidth;
    if (bar > 0) root.style.paddingRight = `calc(${getComputedStyle(root).paddingRight} + ${bar}px)`;
    root.style.overflow = "hidden";
  }
  return () => {
    if (--locks === 0 && saved) {
      root.style.overflow = saved.overflow;
      root.style.paddingRight = saved.paddingRight;
      saved = null;
    }
  };
}

type DialogProps = {
  /** Called when the browser closes it (Esc, Android's back gesture) and, with `dismissOnBackdrop`, on a tap on the bare screen. The host unmounts it. */
  onClose: () => void;
  /** The dialog's name: its own text (`labelledBy`, an id) or a string (`label`). */
  label?: string;
  labelledBy?: string;
  /** A selector inside the dialog for what takes the focus when it opens; without one, the browser picks the first control. */
  initialFocus?: string;
  /** A tap on the screen around the content closes it (the sheet); the viewer fills the screen and has no such place. */
  dismissOnBackdrop?: boolean;
  /** Keys pressed with the focus anywhere inside it. The dialog itself takes the focus when a tap leaves it on nothing, so these keep working. */
  onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void;
  className?: string;
  children: ReactNode;
};

/**
 * The native modal `<dialog>` the viewer and the Control Panel's sheet share, full screen. `showModal()` on mount gives it the top layer
 * (above any z-index), the focus trap, the inert page behind and Esc and Android's back gesture, which the browser answers by closing
 * it (a `cancel`, then a `close` event). It carries its own copy of the CRT layer, since the page's sits below the top layer, and locks
 * the page's scroll while it is open. The host owns whether it is open: the `close` event tells it to unmount, and the focus goes back to
 * what had it when it opened.
 */
export function Dialog({ onClose, label, labelledBy, initialFocus, dismissOnBackdrop = false, onKeyDown, className, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // The latest handler, so the listeners below attach once and the effect doesn't restart when the host's callback changes.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  // A press that began on a control and ended on the bare screen (a drag) isn't a tap on the backdrop.
  const pressedBackdrop = useRef(false);

  // A layout effect: the dialog opens before the first paint, and on unmount it closes while it is still in the page, before React
  // takes it out, so the focus goes back to the opener and not to nothing.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockScroll();
    // Whatever closes it (Esc, the back gesture, a script) ends here: the host is told once, by the browser's own close. The event
    // arrives as a task of its own, so one from a previous mount (Strict Mode's, say) reaches a dialog that has opened again: skip it.
    const onClosed = () => {
      if (!dialog.open) close.current();
    };
    dialog.addEventListener("close", onClosed);
    if (!dialog.open) dialog.showModal();
    if (initialFocus) dialog.querySelector<HTMLElement>(initialFocus)?.focus();
    return () => {
      dialog.removeEventListener("close", onClosed);
      if (dialog.open) dialog.close();
      unlock();
      if (opener?.isConnected) opener.focus();
    };
    // The selector is read once, when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDialogElement>) => {
    pressedBackdrop.current = event.target === event.currentTarget;
  };

  return (
    <dialog
      ref={ref}
      className={className ? `dlg crt-glow ${className}` : "dlg crt-glow"}
      aria-label={label}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onClick={(event) => {
        if (dismissOnBackdrop && pressedBackdrop.current && event.target === event.currentTarget) onClose();
      }}
    >
      {children}
      <div aria-hidden="true" className="crt-flicker" />
      <div aria-hidden="true" className="crt-overlay" />
    </dialog>
  );
}
