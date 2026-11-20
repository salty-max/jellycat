import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { loadReadme } from "../../../core/readme";
import { Crt } from "../../crt";
import { Shell } from "../shell";
import { fullScreenViews } from "../../full-screen-views";

// browse in the shell's full-screen slot, in the mockup's 652×480 frame.
const meta = {
  title: "OS/Browse",
  component: Shell,
  args: { fullScreen: fullScreenViews },
  decorators: [
    (Story) => (
      <div className="h-[480px] w-[652px]">
        <Crt>
          <Story />
        </Crt>
      </div>
    ),
  ],
} satisfies Meta<typeof Shell>;

export default meta;
type Story = StoryObj<typeof meta>;

const input = (canvas: ReturnType<typeof within>) => canvas.getByLabelText("Terminal input");

async function browse(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(input(canvas));
  await userEvent.type(input(canvas), "browse{Enter}");
  return canvas;
}

/** `browse` at `~`: the directory on the left, the selected entry on the right. */
export const Home: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await browse(canvasElement);
    await expect(canvas.getByRole("group", { name: "Directory" })).toBeInTheDocument();
  },
};

/** A project's directory selected: its card in the right pane. */
export const ProjectCard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await browse(canvasElement);
    await userEvent.keyboard("{Enter}");
    await userEvent.click(canvas.getByRole("button", { name: "web/" }));
    await userEvent.keyboard("{Enter}");
    await userEvent.click(canvas.getByRole("button", { name: "hundo/" }));
    await expect(canvas.getByText("Stack")).toBeInTheDocument();
  },
};

/** A project's README selected: the text in the right pane. */
export const ReadmeText: Story = {
  play: async ({ canvasElement }) => {
    // The README's chunk loads from the dev server, a wait that depends on the machine: read it in first, not after a fixed pause.
    await loadReadme("hundo");
    const canvas = await browse(canvasElement);
    await userEvent.keyboard("{Enter}");
    for (const name of ["web/", "hundo/"]) {
      await userEvent.click(canvas.getByRole("button", { name }));
      await userEvent.keyboard("{Enter}");
    }
    await userEvent.keyboard("j");
    // Storybook's test environment doesn't retry a suspended README by itself (a browser does): with the chunk in, moving off and back renders it (the first render read a promise React had not yet seen settle, so it suspended even so).
    await userEvent.keyboard("kj");
    await expect(await canvas.findByRole("heading", { level: 2, name: "Hundo" })).toBeInTheDocument();
  },
};
