import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { loadReadme } from "../../core/readme";
import { Crt } from "../crt";
import { Shell } from "./shell";

// The shell fills its box: the desktop's Terminal window, or a phone's whole screen. The two frames are the mockup's.
const meta = {
  title: "OS/Shell",
  component: Shell,
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

/** First paint: the welcome and the prompt, the cursor hollow because nothing has the focus. */
export const Fresh: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(input(canvas)).not.toHaveFocus();
    // 16px keeps iOS from zooming in on the field.
    await expect(parseFloat(getComputedStyle(input(canvas)).fontSize)).toBeGreaterThanOrEqual(16);
  },
};

/** The same, on a phone's screen. */
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="h-[839px] w-[412px]">
        <Story />
      </div>
    ),
  ],
};

/** Commands run: a directory listing with names as links, a project's card, and the theme changed. */
export const AfterCommands: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(input(canvas));
    await userEvent.type(input(canvas), "cd projects/web{Enter}ls{Enter}open hundo{Enter}");
    await expect(canvas.getByRole("link", { name: "farseer/" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "~/projects/web/hundo/README" })).toBeInTheDocument();
  },
};

/** The prompt without the focus: the block cursor turns hollow. */
export const Unfocused: Story = {
  play: async (context) => {
    await AfterCommands.play?.(context);
    input(within(context.canvasElement)).blur();
  },
};

/** `cat` prints a README as real headings, lists and code. */
export const Cat: Story = {
  play: async ({ canvasElement }) => {
    await loadReadme("hundo"); // the chunk is in before the command asks for it, so the run doesn't race the network
    const canvas = within(canvasElement);
    await userEvent.click(input(canvas));
    await userEvent.type(input(canvas), "cat ~/projects/web/hundo/README{Enter}");
    // Storybook's test environment doesn't retry a suspended README by itself (a browser does): a keystroke renders the log again.
    await userEvent.type(input(canvas), "x");
    await expect(await canvas.findByRole("heading", { level: 2, name: "Hundo" })).toBeInTheDocument();
  },
};

/** `less` pages a README full screen: the path in the border, the position, the key bar. */
export const Pager: Story = {
  play: async ({ canvasElement }) => {
    await loadReadme("hundo"); // the chunk is in before the command asks for it, so the run doesn't race the network
    const canvas = within(canvasElement);
    await userEvent.click(input(canvas));
    await userEvent.type(input(canvas), "less ~/projects/web/hundo/README{Enter}");
    await expect(await canvas.findByRole("heading", { level: 2, name: "Hundo" })).toBeInTheDocument();
    await userEvent.keyboard("{Space}");
  },
};

/** `browse` and `view` stand in a placeholder until the host plugs its views into the full-screen slot. */
export const Browse: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(input(canvas));
    await userEvent.type(input(canvas), "browse{Enter}");
    await expect(canvas.getByText(/placeholder/)).toBeInTheDocument();
  },
};

/** A page's first paint: the session with `open` and the README's `cat` already run, as a project's page has it. */
export const ProjectPage: Story = {
  args: { initialCommand: ["open hundo", "cat ~/projects/web/hundo/README"] },
};
