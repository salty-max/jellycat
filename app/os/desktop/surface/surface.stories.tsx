import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import { Crt } from "../../crt";
import { MenuBar } from "./menu-bar";
import { DesktopSurface } from "./surface";

const NOON = () => new Date(2026, 0, 1, 12, 0);

// The mockup's frame: 652×480, the menu bar over the dithered surface.
const meta = {
  title: "OS/Desktop surface",
  component: DesktopSurface,
  args: { onOpen: () => {} },
  decorators: [
    (Story) => (
      <div className="h-120 w-163">
        <Crt>
          <div className="flex size-full flex-col text-lg">
            <MenuBar now={NOON} />
            <div className="min-h-0 flex-1">
              <Story />
            </div>
          </div>
        </Crt>
      </div>
    ),
  ],
} satisfies Meta<typeof DesktopSurface>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("option", { name: "Projects" }));
  },
};
