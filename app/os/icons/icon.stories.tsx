import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Crt } from "../crt";
import { Glyph, Icon } from "./icon";
import { FOLDER_ICONS, GLYPH_NAMES, ICON_NAMES } from "./names";

// Every icon and glyph on the tube, at the sizes the OS uses, normal and inverted. axe runs on each story under the three phosphors.
function Tube({ children }: { children: ReactNode }) {
  return (
    <div className="h-80">
      <Crt>
        <div className="size-full dither p-4 text-lg">{children}</div>
      </Crt>
    </div>
  );
}

const meta = { title: "OS/Icons", decorators: [(Story) => <Tube><Story /></Tube>] } satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

const label = "mt-1 block px-1";

export const Icons: Story = {
  render: () => (
    <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
      {ICON_NAMES.map((name) => (
        <li key={name} className="flex flex-col items-center">
          <Icon name={name} />
          <span className={label}>{name}</span>
        </li>
      ))}
    </ul>
  ),
};

export const Inverted: Story = {
  render: () => (
    <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
      {ICON_NAMES.map((name) => (
        <li key={name} className="flex flex-col items-center">
          <Icon name={name} inverted />
          <span className={`${label} inverse`}>{name}</span>
        </li>
      ))}
    </ul>
  ),
};

export const Small: Story = {
  render: () => (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {ICON_NAMES.map((name) => (
        <li key={name} className="flex items-center gap-2">
          <Icon name={name} scale={1} />
          {name}
        </li>
      ))}
    </ul>
  ),
};

export const Glyphs: Story = {
  render: () => (
    <ul className="m-0 flex list-none gap-4 p-0">
      {GLYPH_NAMES.map((name) => (
        <li key={name} className="flex flex-col items-center gap-1">
          <span className="flex gap-2">
            <Glyph name={name} />
            <Glyph name={name} inverted className="inverse" />
          </span>
          {name}
        </li>
      ))}
    </ul>
  ),
};

export const Folders: Story = {
  render: () => (
    <ul className="m-0 flex list-none gap-6 p-0">
      {(Object.entries(FOLDER_ICONS) as [string, (typeof FOLDER_ICONS)[keyof typeof FOLDER_ICONS]][]).map(([folder, icon]) => (
        <li key={folder} className="flex flex-col items-center">
          <Icon name={icon} />
          <span className={label}>{folder}</span>
        </li>
      ))}
    </ul>
  ),
};
