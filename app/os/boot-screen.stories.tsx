import type { Meta, StoryObj } from "@storybook/react-vite";
import { BootScreen } from "./boot-screen";
import { Crt } from "./crt";

const meta = {
  title: "OS/Boot screen",
  component: BootScreen,
  decorators: [
    (Story) => (
      <div className="h-96">
        <Crt>
          <Story />
        </Crt>
      </div>
    ),
  ],
} satisfies Meta<typeof BootScreen>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
