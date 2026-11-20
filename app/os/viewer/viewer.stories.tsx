import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { DEFAULT_SETTINGS, useSettings } from "../../core/settings";
import { Crt } from "../crt";
import { Desktop } from "../desktop/desktop";
import { openViewer } from "../desktop/apps/launch";
import { useWindows } from "../desktop/windows/store";
import { fullScreenViews } from "../full-screen-views";
import { Shell } from "../shell/shell";

// The viewer in the desktop's 652x480 frame, and full screen in the shell.
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

/** `view hundo` in the shell: full screen, the count in the top border, the caption under the picture. */
export const FullScreen: Story = {
  render: () => <Shell fullScreen={fullScreenViews} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Terminal input");
    await userEvent.click(input);
    await userEvent.type(input, "view hundo{Enter}");
    await expect(canvas.getByText("1 of 3")).toBeInTheDocument();
  },
};
