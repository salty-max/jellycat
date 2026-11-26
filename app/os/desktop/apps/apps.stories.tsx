import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { loadReadme } from "../../../core/readme";
import { DEFAULT_SETTINGS, useSettings } from "../../../core/settings";
import { Crt } from "../../crt";
import { Desktop } from "../desktop";
import { useWindows } from "../windows/store";
import { useFolderViews } from "./folder-view";
import { ids, openControlPanel, openFolder, openProjectReadme, openStudioReadme, openTerminal } from "./launch";

// The desktop's apps in the desktop, at the mockup's frame (652x480): Projects behind, as the mockup boots, and the app in front.
function Apps({ open, slug, byName = false }: { open?: () => void; slug?: string; byName?: boolean }) {
  // Once, before the first paint, so the windows are there when the play function runs; Storybook's UI doesn't reset the stores
  // between stories as Vitest does.
  useState(() => {
    useWindows.setState(useWindows.getInitialState(), true);
    useFolderViews.setState(useFolderViews.getInitialState(), true);
    useSettings.setState(DEFAULT_SETTINGS);
    useWindows.getState().setDesk({ w: 652, h: 456 });
    openFolder("projects");
    if (byName) useFolderViews.getState().setView(ids.folder("projects"), "name");
    open?.();
  });
  return <Desktop route={slug ? { page: "project", params: { slug }, data: { blocks: null } } : undefined} />;
}

const meta = {
  title: "OS/Desktop apps",
  component: Apps,
  decorators: [
    (Story) => (
      <div className="h-120 w-163">
        <Crt>
          <Story />
        </Crt>
      </div>
    ),
  ],
} satisfies Meta<typeof Apps>;
export default meta;

type Story = StoryObj<typeof meta>;

export const ProjectsFolder: Story = {
  play: async ({ canvasElement }) => {
    const projects = within(canvasElement).getByRole("dialog", { name: "Projects" });
    await expect(within(projects).getByText("4 items")).toBeInTheDocument();
  },
};

export const ProjectsByName: Story = {
  args: { byName: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("by name")).toBeInTheDocument();
  },
};

export const WebFolder: Story = {
  args: { open: () => void openFolder("web") },
  play: async ({ canvasElement }) => {
    await expect(within(within(canvasElement).getByRole("dialog", { name: "Web" })).getByRole("option", { name: /Hundo/ })).toBeInTheDocument();
  },
};

export const EmptyTrash: Story = {
  args: { open: () => void openFolder("trash") },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("No items")).toBeInTheDocument();
  },
};

export const InfoWindow: Story = {
  args: { slug: "hundo" },
  play: async ({ canvasElement }) => {
    const info = within(canvasElement).getByRole("dialog", { name: "Hundo Info" });
    await expect(within(info).getByRole("button", { name: "Open Readme" })).toBeInTheDocument();
  },
};

export const ProjectReadme: Story = {
  // The README's chunk loads from the dev server, a wait that depends on the machine: the window waits on the same promise.
  args: { open: () => void openProjectReadme("hundo") },
  play: async ({ canvasElement }) => {
    await loadReadme("hundo");
    const readme = within(canvasElement).getByRole("dialog", { name: "Hundo Readme" });
    await expect(await within(readme).findByRole("heading", { name: "Hundo" })).toBeInTheDocument();
  },
};

export const StudioReadme: Story = {
  args: { open: () => void openStudioReadme() },
  play: async ({ canvasElement }) => {
    await expect(within(within(canvasElement).getByRole("dialog", { name: "Readme" })).getByRole("link", { name: "max@jellycat.fr" })).toBeInTheDocument();
  },
};

export const ControlPanel: Story = {
  args: { open: () => void openControlPanel() },
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement).getByRole("dialog", { name: "Control Panel" });
    await userEvent.click(within(panel).getByRole("radio", { name: "Amber" }));
    await expect(within(panel).getByRole("radio", { name: "Amber" })).toBeChecked();
    await userEvent.click(within(panel).getByRole("radio", { name: "Green" }));
  },
};

export const Terminal: Story = {
  args: { open: () => void openTerminal() },
  play: async ({ canvasElement }) => {
    await expect(within(within(canvasElement).getByRole("dialog", { name: "Terminal" })).getByLabelText("Terminal input")).toBeInTheDocument();
  },
};
