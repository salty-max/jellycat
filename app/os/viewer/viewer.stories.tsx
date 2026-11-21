import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { DEFAULT_SETTINGS, useSettings } from "../../core/settings";
import { Crt } from "../crt";
import { Desktop } from "../desktop/desktop";
import { openViewer } from "../desktop/apps/launch";
import { useWindows } from "../desktop/windows/store";

// The viewer in the desktop's 652x480 frame.
function ViewerDesk({ slug }: { slug: string }) {
  useState(() => {
    useWindows.setState(useWindows.getInitialState(), true);
    useSettings.setState(DEFAULT_SETTINGS);
    useWindows.getState().setDesk({ w: 652, h: 456 });
    openViewer(slug);
  });
  return <Desktop />;
}

const meta = {
  title: "OS/Viewer",
  component: ViewerDesk,
  args: { slug: "hundo" },
  decorators: [
    (Story) => (
      <div className="h-120 w-163">
        <Crt>
          <Story />
        </Crt>
      </div>
    ),
  ],
} satisfies Meta<typeof ViewerDesk>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The window on the desktop: the count in its info line, the caption and the buttons under the picture; previous is dim. */
export const Window: Story = {
  play: async ({ canvasElement }) => {
    const viewer = await within(canvasElement).findByRole("dialog", { name: "Hundo Screenshots" });
    await expect(within(viewer).getByText("1 of 3")).toBeInTheDocument();
    await expect(within(viewer).getByRole("button", { name: "Previous picture" })).toBeDisabled();
  },
};

/** A phone-sized picture in the same box, which keeps its size. */
export const WindowPhonePicture: Story = {
  play: async ({ canvasElement }) => {
    const viewer = await within(canvasElement).findByRole("dialog", { name: "Hundo Screenshots" });
    await userEvent.click(within(viewer).getByRole("button", { name: "Next picture" }));
    await userEvent.click(within(viewer).getByRole("button", { name: "Next picture" }));
    await expect(within(viewer).getByText("3 of 3")).toBeInTheDocument();
    await expect(within(viewer).getByRole("button", { name: "Next picture" })).toBeDisabled();
  },
};
