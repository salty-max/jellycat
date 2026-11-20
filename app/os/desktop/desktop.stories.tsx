import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, within } from "storybook/test";
import { plainText, README } from "../../core/studio";
import { Crt } from "../crt";
import { Desktop } from "./desktop";
import type { AppProps } from "./registry";
import { useWindows, type OpenOptions } from "./windows/store";

// The assembled desktop at the mockup's frame (652x480): what a wide screen shows once the boot screen is gone.
const Text = ({ text }: AppProps & { text: string }) => <p className="whitespace-pre-wrap">{text}</p>;
const registry = { text: Text };

function Booted({ windows = [] }: { windows?: OpenOptions[] }) {
  // Once, before the first paint, so the windows are there when the play function runs; Storybook's UI doesn't reset the store
  // between stories as Vitest does.
  useState(() => {
    useWindows.setState(useWindows.getInitialState(), true);
    useWindows.getState().setDesk({ w: 652, h: 456 });
    for (const window of windows) useWindows.getState().open(window);
  });
  return <Desktop registry={registry} />;
}

const meta = {
  title: "OS/Desktop",
  component: Booted,
  decorators: [
    (Story) => (
      <div className="h-120 w-163">
        <Crt>
          <Story />
        </Crt>
      </div>
    ),
  ],
} satisfies Meta<typeof Booted>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("listbox", { name: "Desktop" })).toBeInTheDocument();
  },
};

/** The mockup's first two windows: Projects behind, the Readme in front with its inverse title bar. */
export const Windows: Story = {
  args: {
    windows: [
      { id: "projects", app: "text", title: "Projects", size: { w: 380, h: 232 }, props: { text: "Behind." } },
      { id: "readme", app: "text", title: "Readme", size: { w: 340, h: 210 }, props: { text: plainText(README) } },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("dialog", { name: "Readme" })).toBeInTheDocument();
  },
};
