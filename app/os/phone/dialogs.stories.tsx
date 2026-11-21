import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { DEFAULT_SETTINGS, useSettings } from "../../core/settings";
import { ControlPanelSheet } from "./control-panel-sheet";
import { PhoneViewer } from "./viewer-dialog";

// A page with its button, as the dialogs open from it: the dialog is native and full screen, so the story is the screen. A page that
// scrolls, so the dither has something to dim.
function Page({ dialog }: { dialog: (close: () => void) => React.ReactNode }) {
  useState(() => useSettings.setState(DEFAULT_SETTINGS));
  const [open, setOpen] = useState(false);
  return (
    <main className="p-4">
      <h1>Jellycat Studio</h1>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        Open
      </button>
      {open && dialog(() => setOpen(false))}
    </main>
  );
}

const meta = {
  title: "Phone/Dialogs",
  component: Page,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Page>;
export default meta;
type Story = StoryObj<typeof meta>;

// What Esc and Android's back gesture do to the browser's modal dialog: the same request to close, `cancel` then `close`. (The stories'
// keyboard is synthetic and never reaches the browser's own Esc; the e2e test presses the real key.)
const requestClose = (dialog: HTMLElement) => (dialog as HTMLDialogElement).requestClose();

// A closed dialog is out of the accessibility tree at once; the host takes it out of the page a moment later.
const gone = (root: HTMLElement) => waitFor(() => expect(root.querySelector("dialog")).toBeNull());

/** The viewer from a picture: the name and the count in the double border, the picture whole in its colours, Close focused. */
export const Viewer: Story = {
  args: { dialog: (close) => <PhoneViewer slug="hundo" start={0} onClose={close} /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Open" }));
    const viewer = await canvas.findByRole("dialog", { name: "Hundo screenshots" });
    // Modal, in the top layer: the browser inerts the page behind it.
    expect(viewer.matches(":modal")).toBe(true);
    await expect(within(viewer).getByRole("button", { name: "Close" })).toHaveFocus();
    await expect(within(viewer).getByText("1 of 3")).toBeInTheDocument();
    await expect(within(viewer).getByRole("button", { name: "Previous" })).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(within(viewer).getByRole("button", { name: "Next" }));
    await expect(within(viewer).getByText("2 of 3")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowRight}");
    await expect(within(viewer).getByText("3 of 3")).toBeInTheDocument();
    await expect(within(viewer).getByRole("button", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
  },
};

/** The last picture, a phone's own screenshot: the pane keeps the viewer's size and the picture is whole. */
export const ViewerPhonePicture: Story = {
  args: { dialog: (close) => <PhoneViewer slug="hundo" start={2} onClose={close} /> },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Open" }));
    const viewer = await within(canvasElement).findByRole("dialog", { name: "Hundo screenshots" });
    await expect(within(viewer).getByText("3 of 3")).toBeInTheDocument();
    await expect(within(viewer).getByRole("button", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
  },
};

/** A request to close, as Esc and Android's back gesture make it, closes it and give the focus back to the button that opened it. */
export const ViewerCancel: Story = {
  args: { dialog: (close) => <PhoneViewer slug="hundo" start={1} onClose={close} /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const opener = canvas.getByRole("button", { name: "Open" });
    // Whatever an earlier story left open holds the lock: this one gives back what it took.
    const before = document.documentElement.style.overflow;
    await userEvent.click(opener);
    const viewer = await canvas.findByRole("dialog", { name: "Hundo screenshots" });
    expect(document.documentElement.style.overflow).toBe("hidden");
    requestClose(viewer);
    await gone(canvasElement);
    await expect(opener).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe(before);
  },
};

/** The Control Panel's sheet: a window docked at the bottom over the dithered page, the checked phosphor focused. */
export const Sheet: Story = {
  args: { dialog: (close) => <ControlPanelSheet onClose={close} /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Open" }));
    const sheet = await canvas.findByRole("dialog", { name: "Control Panel" });
    expect(sheet.matches(":modal")).toBe(true);
    await expect(within(sheet).getByRole("radio", { name: "Green" })).toHaveFocus();
    await userEvent.click(within(sheet).getByRole("radio", { name: "Amber" }));
    await expect(within(sheet).getByRole("radio", { name: "Amber" })).toBeChecked();
    await userEvent.click(within(sheet).getByRole("checkbox", { name: "Flicker" }));
    await expect(within(sheet).getByRole("checkbox", { name: "Flicker" })).toBeChecked();
    await expect(within(sheet).queryByText("Dither pattern")).not.toBeInTheDocument();
    // Put the store back: Storybook's UI doesn't reset it between stories.
    await userEvent.click(within(sheet).getByRole("radio", { name: "Green" }));
    await userEvent.click(within(sheet).getByRole("checkbox", { name: "Flicker" }));
  },
};

/** The close box and a tap on the dithered page close it, and the focus goes back to the button. */
export const SheetClose: Story = {
  args: { dialog: (close) => <ControlPanelSheet onClose={close} /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const opener = canvas.getByRole("button", { name: "Open" });
    await userEvent.click(opener);
    await userEvent.click(await within(await canvas.findByRole("dialog", { name: "Control Panel" })).findByRole("button", { name: "Close" }));
    await gone(canvasElement);
    await expect(opener).toHaveFocus();

    await userEvent.click(opener);
    const sheet = await canvas.findByRole("dialog", { name: "Control Panel" });
    await userEvent.click(sheet);
    await gone(canvasElement);
    await expect(opener).toHaveFocus();
  },
};
