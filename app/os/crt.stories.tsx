import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, type ReactNode } from "react";
import { DEFAULT_SETTINGS, applySettings, type Settings } from "../core/settings";
import { Crt } from "./crt";
import { Icon } from "./icons/icon";

// The effects are <html data-*> attributes, as in the page. A story sets them for its own render and puts the defaults back after.
function WithSettings({ settings, children }: { settings: Partial<Settings>; children: ReactNode }) {
  useLayoutEffect(() => {
    // The phosphor stays the one Storybook's toolbar (and the per-phosphor test projects) picked; only the effects change.
    const phosphor = document.documentElement.dataset.phosphor as Settings["phosphor"];
    applySettings({ ...DEFAULT_SETTINGS, phosphor, ...settings });
    return () => applySettings({ ...DEFAULT_SETTINGS, phosphor });
  }, [settings]);
  return children;
}

function Screen() {
  return (
    <div className="flex size-full flex-col gap-2 dither p-4 text-lg">
      <p className="m-0">Full colour text, with its glow.</p>
      <p className="m-0 text-phosphor-dim">Dim text for secondary lines.</p>
      <p className="m-0">
        <span className="px-1 inverse">Inverse video</span>
      </p>
      <div className="flex gap-3">
        <Icon name="folder" />
        <Icon name="term" />
        <Icon name="doc" inverted />
      </div>
    </div>
  );
}

const meta = { title: "OS/CRT" } satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

const tube = (settings: Partial<Settings>): Story => ({
  render: () => (
    <WithSettings settings={settings}>
      <div className="h-64">
        <Crt>
          <Screen />
        </Crt>
      </div>
    </WithSettings>
  ),
});

export const Default: Story = tube({});
export const NoScanlines: Story = tube({ scanlines: false });
export const NoGlow: Story = tube({ glow: false });
export const Flicker: Story = tube({ flicker: true });
export const NoDither: Story = tube({ dither: false });
export const AllOff: Story = tube({ scanlines: false, glow: false, flicker: false, dither: false });
