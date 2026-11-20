import type { Meta, StoryObj } from "@storybook/react-vite";
import { BootScreen, ShutDownScreen } from "./boot-screen";
import { Crt } from "./crt";

const meta = {
  title: "OS/Boot screen",
  component: BootScreen,
  decorators: [
    (Story) => (
      <div className="h-120 w-163">
        <Crt>
          <Story />
        </Crt>
      </div>
    ),
  ],
} satisfies Meta<typeof BootScreen>;

export default meta;

export const Default: StoryObj<typeof meta> = {};

export const ShutDown: StoryObj<typeof meta> = { render: () => <ShutDownScreen onRestart={() => {}} /> };
