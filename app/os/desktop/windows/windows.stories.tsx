import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";

import { Crt } from "../../crt";
import { AlertDialog } from "./alert-dialog";
import { useWindows } from "./store";
import { WindowLayer } from "./window-layer";

import type { Meta, StoryObj } from "@storybook/react-vite";
import type { AppProps } from "../registry";

const Text = ({ text }: AppProps & { text: string }) => <p>{text}</p>;
const registry = { text: Text };

// Opens windows the way the desktop will, at the mockup's frame (652×456 under the 24px menu bar).
function Desk({ windows }: { windows: { title: string; id: string; w: number; h: number; text: string }[] }) {
  // Once, before the first paint, so the windows are there when the play function runs.
  useState(() => {
    // Storybook's UI doesn't reset the store between stories as Vitest does.
    useWindows.setState(useWindows.getInitialState(), true);
    const { setDesk, open } = useWindows.getState();
    setDesk({ w: 652, h: 456 });
    for (const { id, title, w, h, text } of windows) open({ id, app: "text", title, size: { w, h }, props: { text } });
  });
  return (
    <div className="relative overflow-hidden dither" style={{ width: 652, height: 456 }}>
      <WindowLayer registry={registry} />
    </div>
  );
}

const meta = {
  title: "OS/Windows",
  component: Desk,
  decorators: [
    // The desktop's type, which windows and dialogs inherit from it (app/os/desktop/desktop.tsx).
    (Story) => (
      <Crt>
        <div className="size-full text-lg leading-[1.1]">
          <Story />
        </div>
      </Crt>
    ),
  ],
  args: {
    windows: [
      { id: "back", title: "Projects", w: 380, h: 232, text: "Behind." },
      { id: "front", title: "Readme", w: 340, h: 210, text: "In front: its title bar is inverse." },
    ],
  },
} satisfies Meta<typeof Desk>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stacked: Story = {};

export const Collapsed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: "Collapse" })[1]!);
    await expect(useWindows.getState().windows.front?.collapsed).toBe(true);
  },
};

export const Zoomed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: "Zoom" })[1]!);
    await expect(useWindows.getState().windows.front).toMatchObject({ x: 8, y: 8 });
  },
};

export const MovedByKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const front = within(canvasElement).getByRole("dialog", { name: "Readme" });
    within(front).getByRole("group").focus();
    await userEvent.keyboard("{ArrowRight}{ArrowDown}{Shift>}{ArrowRight}{/Shift}");
    await expect(useWindows.getState().windows.front).toMatchObject({ x: 50, y: 42, w: 348 });
  },
};

function AlertDemo({ container }: { container: boolean }) {
  const [desk, setDesk] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(true);
  return (
    <div ref={setDesk} className="relative overflow-hidden dither" style={{ width: 652, height: 456 }}>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title="Shut down Jelly-OS?"
        actions={[{ label: "Cancel" }, { label: "Shut Down", default: true }]}
        container={container ? desk : undefined}
      />
    </div>
  );
}

export const Alert: StoryObj = {
  render: () => <AlertDemo container />,
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement.ownerDocument.body).findByRole("alertdialog", { name: "Shut down Jelly-OS?" })).toBeInTheDocument();
  },
};
