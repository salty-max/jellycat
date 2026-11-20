import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useSettings } from "../../../core/settings";
import { Crt } from "../../crt";
import { Desktop } from "../desktop";
import { openControlPanel, openFolder } from "../apps/launch";
import { useFolderViews } from "../apps/folder-view";
import { useWindows } from "../windows/store";
import { useSelection } from "./selection";

// The desktop at the mockup's frame (652x480) with Projects and the Control Panel open, and a menu opened by each story.
function Booted() {
  // Once, before the first paint, so the windows are there when the play function runs.
  useState(() => {
    useWindows.setState(useWindows.getInitialState(), true);
    useSettings.getState().reset();
    useFolderViews.setState({ views: {} });
    useSelection.setState({ selected: null });
    useWindows.getState().setDesk({ w: 652, h: 456 });
    openFolder("projects");
    openControlPanel();
  });
  return <Desktop onRestart={() => {}} onShutDown={() => {}} />;
}

const meta = {
  title: "OS/Menu bar",
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

const bar = (canvasElement: HTMLElement, name: string) => within(canvasElement).getByRole("menuitem", { name });
const openMenu = async (canvasElement: HTMLElement, name: string) => {
  await userEvent.click(bar(canvasElement, name));
  await expect(await within(canvasElement).findByRole("menu")).toBeVisible();
};

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement)
        .getAllByRole("menuitem")
        .map((each) => each.textContent || each.getAttribute("aria-label")),
    ).toEqual(["Jelly-OS", "File", "Edit", "View", "Special", "Window"]);
  },
};

export const CatMenu: Story = { play: ({ canvasElement }) => openMenu(canvasElement, "Jelly-OS") };
export const File: Story = { play: ({ canvasElement }) => openMenu(canvasElement, "File") };
export const Edit: Story = { play: ({ canvasElement }) => openMenu(canvasElement, "Edit") };
export const View: Story = { play: ({ canvasElement }) => openMenu(canvasElement, "View") };
export const Special: Story = { play: ({ canvasElement }) => openMenu(canvasElement, "Special") };
export const WindowMenu: Story = { play: ({ canvasElement }) => openMenu(canvasElement, "Window") };

/** Hover moves between menus while one is open. */
export const HoverSwitches: Story = {
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement, "File");
    await userEvent.hover(bar(canvasElement, "Edit"));
    await userEvent.hover(bar(canvasElement, "Special"));
    await waitFor(() => expect(within(canvasElement).getByRole("menuitem", { name: "Restart" })).toBeVisible());
    await expect(within(canvasElement).queryByRole("menuitem", { name: "Close Window" })).toBeNull();
  },
};

export const KeyboardAndEscape: Story = {
  play: async ({ canvasElement }) => {
    bar(canvasElement, "File").focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowDown}");
    await expect(await within(canvasElement).findByRole("menuitemradio", { name: "Green phosphor" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(canvasElement).queryByRole("menu")).toBeNull());
  },
};

export const About: Story = {
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement, "Jelly-OS");
    await userEvent.click(within(canvasElement).getByRole("menuitem", { name: "About Jelly-OS" }));
    await expect(await within(canvasElement).findByRole("alertdialog", { name: "Jelly-OS 1.0" })).toBeVisible();
  },
};

export const ShutDown: Story = {
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement, "Special");
    await userEvent.click(within(canvasElement).getByRole("menuitem", { name: "Shut Down..." }));
    await expect(await within(canvasElement).findByRole("alertdialog", { name: "Shut down Jelly-OS?" })).toBeVisible();
  },
};
