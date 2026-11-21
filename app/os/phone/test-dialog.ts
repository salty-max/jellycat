import { act } from "@testing-library/react";
import { vi } from "vitest";

/**
 * jsdom has no `showModal()` or `close()` on a `<dialog>`: these set and clear `open` and queue the `close` event, which is what the
 * dialogs read. The focus trap, the top layer and the inert page behind are the browser's: the stories (real Chrome) cover those.
 */
export function stubDialog() {
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    if (this.open) throw new DOMException("The dialog is already open.", "InvalidStateError");
    this.setAttribute("open", "");
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute("open");
    queueMicrotask(() => this.dispatchEvent(new Event("close")));
  });
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
  return { showModal, close };
}

/**
 * What Esc and Android's back gesture do to a modal dialog: a `cancel` the page may stop, then, if it didn't, the browser closes it
 * (the `close` event follows). Returns whether the page left it alone.
 */
export async function cancelDialog(dialog: HTMLElement): Promise<boolean> {
  let left = true;
  await act(async () => {
    left = dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    if (left && dialog instanceof HTMLDialogElement) dialog.close();
  });
  return left;
}
