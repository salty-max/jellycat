import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, useState } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { Dialog } from "./dialog";
import { cancelDialog, stubDialog } from "./test-dialog";

let dialogs: ReturnType<typeof stubDialog>;
beforeEach(() => {
  dialogs = stubDialog();
  document.documentElement.removeAttribute("style");
});

// A button that opens a dialog, as a page does.
function Host({ onClosed, dismissOnBackdrop }: { onClosed?: () => void; dismissOnBackdrop?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    onClosed?.();
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Dialog onClose={close} label="Things" initialFocus="[data-first]" dismissOnBackdrop={dismissOnBackdrop}>
          <button type="button">Before</button>
          <button type="button" data-first="">
            First
          </button>
        </Dialog>
      )}
    </>
  );
}

const dialog = () => screen.getByRole("dialog", { name: "Things" });

test("it opens as a modal dialog on mount, named, with the CRT layer inside it taking no clicks and hidden from screen readers", async () => {
  render(<Host />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  expect(dialogs.showModal).toHaveBeenCalledTimes(1);
  const layers = dialog().querySelectorAll('[aria-hidden="true"]');
  expect([...layers].map((layer) => layer.className)).toEqual(["crt-flicker", "crt-overlay"]);
});

test("the focus goes to the chosen control, and back to what had it when the dialog goes", async () => {
  const user = userEvent.setup();
  render(<Host />);
  const opener = screen.getByRole("button", { name: "Open" });
  await user.click(opener);
  expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  await cancelDialog(dialog());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

test("Esc and Android's back gesture: the browser closes the dialog, and the close event tells the host", async () => {
  const onClosed = vi.fn();
  render(<Host onClosed={onClosed} />);
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  const left = await cancelDialog(dialog());
  expect(left).toBe(true);
  expect(onClosed).toHaveBeenCalledTimes(1);
});

test("anything else that closes it, a script's close, tells the host too", async () => {
  const onClosed = vi.fn();
  render(<Host onClosed={onClosed} />);
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  await act(async () => (dialog() as HTMLDialogElement).close());
  expect(onClosed).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("the dialog is closed once when it goes, and the host is not told again by the close event", async () => {
  const onClosed = vi.fn();
  render(<Host onClosed={onClosed} />);
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  const element = dialog();
  await cancelDialog(element);
  await act(async () => {});
  // Once by the browser's close, then none by the dialog going.
  expect(dialogs.close).toHaveBeenCalledTimes(1);
  expect(element).not.toHaveAttribute("open");
  expect(onClosed).toHaveBeenCalledTimes(1);
});

test("React Strict Mode's second mount opens it again, and the first mount's close event doesn't tell the host", async () => {
  const onClosed = vi.fn();
  render(
    <StrictMode>
      <Dialog onClose={onClosed} label="Things">
        <button type="button">Inside</button>
      </Dialog>
    </StrictMode>,
  );
  await act(async () => {});
  expect(dialog()).toHaveAttribute("open");
  expect(dialogs.showModal).toHaveBeenCalledTimes(2);
  expect(dialogs.close).toHaveBeenCalledTimes(1);
  expect(onClosed).not.toHaveBeenCalled();
});

test("a tap on the bare screen closes a dialog that says so, and a tap on its content doesn't", async () => {
  const onClosed = vi.fn();
  render(<Host onClosed={onClosed} dismissOnBackdrop />);
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  await userEvent.click(screen.getByRole("button", { name: "Before" }));
  expect(onClosed).not.toHaveBeenCalled();
  await userEvent.click(dialog());
  expect(onClosed).toHaveBeenCalledTimes(1);
});

test("a press that began on the content and ended on the bare screen (a drag) doesn't close it", async () => {
  const onClosed = vi.fn();
  render(<Host onClosed={onClosed} dismissOnBackdrop />);
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  fireEvent.pointerDown(screen.getByRole("button", { name: "Before" }));
  fireEvent.click(dialog());
  expect(onClosed).not.toHaveBeenCalled();
});

test("a dialog that doesn't say so ignores a tap on the bare screen", async () => {
  const onClosed = vi.fn();
  render(<Host onClosed={onClosed} />);
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  await userEvent.click(dialog());
  expect(onClosed).not.toHaveBeenCalled();
});

test("the page behind doesn't scroll while a dialog is open, and does again after", async () => {
  const root = document.documentElement;
  render(<Host />);
  expect(root.style.overflow).toBe("");
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  expect(root.style.overflow).toBe("hidden");
  await cancelDialog(dialog());
  expect(root.style.overflow).toBe("");
});

test("two dialogs share one lock: it stays until the last goes", () => {
  const root = document.documentElement;
  const first = render(<Dialog onClose={() => {}}>one</Dialog>);
  const second = render(<Dialog onClose={() => {}}>two</Dialog>);
  expect(root.style.overflow).toBe("hidden");
  first.unmount();
  expect(root.style.overflow).toBe("hidden");
  second.unmount();
  expect(root.style.overflow).toBe("");
});

test("the callback it calls is the host's latest one", async () => {
  const first = vi.fn();
  const second = vi.fn();
  const { rerender } = render(<Dialog onClose={first}>x</Dialog>);
  rerender(<Dialog onClose={second}>x</Dialog>);
  await cancelDialog(document.querySelector("dialog")!);
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});
