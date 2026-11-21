import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";
import { expect, fn, userEvent, within } from "storybook/test";
import { projectBySlug } from "../../core/projects";
import { loadReadme } from "../../core/readme";
import { PhoneHeader } from "./header";
import { PhoneHome } from "./home";
import { PhonePage } from "./page";
import { PhoneProject } from "./project";

// The phone's pages, unwired: each in the page that frames it, on the viewport's whole width (the mockup's frame is 412x839). The
// router is a memory one, as the glue will be the real one. Every story runs under each phosphor, with axe.
const inRouter: Decorator = (Story) => (
  <MemoryRouter>
    <Story />
  </MemoryRouter>
);

const meta = {
  title: "OS/Phone",
  component: PhonePage,
  parameters: { layout: "fullscreen" },
  decorators: [inRouter],
  args: { onOpenPanel: fn(), children: null },
} satisfies Meta<typeof PhonePage>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The home page: the studio and its contact, the folders as tabs, each folder's bar and its cards. */
export const Home: Story = {
  render: (args) => (
    <PhonePage {...args}>
      <PhoneHome />
    </PhonePage>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Jellycat Studio" })).toBeInTheDocument();
    await expect(canvas.getByRole("heading", { level: 2, name: /^Web/ })).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Hundo" })).toHaveAttribute("href", "/projects/hundo");
    await userEvent.click(canvas.getByRole("button", { name: "Control Panel" }));
    await expect(args.onOpenPanel).toHaveBeenCalledOnce();
  },
};

/** The Control Panel's button while its sheet is open: inverse video. */
export const PanelOpen: Story = {
  render: (args) => (
    <PhonePage {...args} panelOpen>
      <PhoneHome />
    </PhonePage>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "Control Panel" })).toHaveAttribute("aria-expanded", "true");
  },
};

const hundo = projectBySlug("hundo")!;

/** A project with pictures: facts, the pictures stacked (a desktop one the column's width, a phone one half of it), its README. */
export const Project: Story = {
  loaders: [async () => ({ blocks: await loadReadme("hundo") })],
  render: (args, { loaded }) => (
    <PhonePage {...args}>
      <PhoneProject project={hundo} blocks={loaded.blocks} onOpenPicture={fn()} />
    </PhonePage>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Hundo" })).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "hundo.quest" })).toHaveAttribute("target", "_blank");
    await expect(canvas.getByRole("heading", { level: 2, name: /^Screenshots/ })).toBeInTheDocument();
    await expect(canvas.getByRole("region", { name: "README" })).toBeInTheDocument();
  },
};

/** A project with no pictures and an unknown link: `-`, and no Screenshots heading. */
export const ProjectWithoutPictures: Story = {
  loaders: [async () => ({ blocks: await loadReadme("keyring") })],
  render: (args, { loaded }) => (
    <PhonePage {...args}>
      <PhoneProject project={projectBySlug("keyring")!} blocks={loaded.blocks} onOpenPicture={fn()} />
    </PhonePage>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("heading", { name: /^Screenshots/ })).toBeNull();
  },
};

/** The README's chunk could not be loaded: the pane says so. */
export const ProjectReadmeFailed: Story = {
  render: (args) => (
    <PhonePage {...args}>
      <PhoneProject project={hundo} blocks={null} onOpenPicture={fn()} />
    </PhonePage>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("README: could not be loaded")).toBeInTheDocument();
  },
};

/** The header alone. */
export const Header: Story = {
  render: (args) => <PhoneHeader onOpenPanel={args.onOpenPanel} />,
};
