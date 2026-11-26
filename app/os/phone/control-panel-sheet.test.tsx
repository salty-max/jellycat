import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { useSettings } from "../../core/settings";
import { ControlPanelSheet } from "./control-panel-sheet";
import { cancelDialog, stubDialog } from "./test-dialog";

beforeEach(() => void stubDialog());

const sheet = () => screen.getByRole("dialog", { name: "Control Panel" });

// The header's button, as the page has it.
function Header({ onClosed }: { onClosed?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        Open panel
      </button>
      {open && (
        <ControlPanelSheet
          onClose={() => {
            setOpen(false);
            onClosed?.();
          }}
        />
      )}
    </>
  );
}

test("it is a modal dialog named by its title, with the phosphor, the effects and the sound and no dither pattern", () => {
  render(<ControlPanelSheet onClose={() => {}} />);
  const panel = within(sheet());
  expect(panel.getByRole("heading", { name: "Control Panel", level: 2 })).toBeInTheDocument();
  expect(panel.getByRole("radiogroup", { name: "Phosphor" })).toBeInTheDocument();
  expect(panel.getAllByRole("radio").map((radio) => radio.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
  expect(panel.getByRole("group", { name: "Effects" })).toBeInTheDocument();
  expect(panel.getAllByRole("checkbox").map((box) => box.parentElement?.textContent)).toEqual(["Scanlines", "Glow", "Flicker", "On"]);
  expect(panel.getByRole("group", { name: "Sound" })).toBeInTheDocument();
  expect(panel.queryByText("Dither pattern")).not.toBeInTheDocument();
});

test("the focus goes to the checked phosphor, the saved one, which is the group's tab stop", async () => {
  useSettings.setState({ phosphor: "amber" });
  render(<ControlPanelSheet onClose={() => {}} />);
  const amber = screen.getByRole("radio", { name: "Amber" });
  // A frame after it opens, once the radio group knows its radios (dialog.tsx says why): focused any sooner, it stays out of the tab
  // order and the first arrow does nothing.
  await waitFor(() => expect(amber).toHaveFocus());
  expect(amber).toHaveAttribute("tabindex", "0");
});

test("choosing a phosphor and toggling an effect write the settings store the desktop's Control Panel writes", async () => {
  const user = userEvent.setup();
  render(<ControlPanelSheet onClose={() => {}} />);
  await user.click(screen.getByRole("radio", { name: "White" }));
  expect(useSettings.getState().phosphor).toBe("white");
  expect(screen.getByRole("radio", { name: "White" })).toBeChecked();
  await user.click(screen.getByRole("checkbox", { name: "Flicker" }));
  expect(useSettings.getState().flicker).toBe(true);
  await user.click(screen.getByRole("checkbox", { name: "Scanlines" }));
  expect(useSettings.getState().scanlines).toBe(false);
});

test("the close box, cancel (Esc, Android's back) and a tap on the dithered screen close it; a tap on the window doesn't", async () => {
  const user = userEvent.setup();
  const onClosed = vi.fn();
  render(<Header onClosed={onClosed} />);
  const opener = screen.getByRole("button", { name: "Open panel" });

  await user.click(opener);
  await user.click(screen.getByRole("heading", { name: "Control Panel" }));
  expect(onClosed).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(onClosed).toHaveBeenCalledTimes(1);
  expect(opener).toHaveFocus();

  await user.click(opener);
  await cancelDialog(sheet());
  expect(onClosed).toHaveBeenCalledTimes(2);

  await user.click(opener);
  await user.click(sheet());
  expect(onClosed).toHaveBeenCalledTimes(3);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
