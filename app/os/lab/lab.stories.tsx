import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { DEFAULT_SETTINGS, useSettings } from "../../core/settings";
import type { Program } from "../../lab/run";
import { Crt } from "../crt";
import { openLab } from "../desktop/apps/launch";
import { Desktop } from "../desktop/desktop";
import { REGISTRY } from "../desktop/registry";
import { useWindows } from "../desktop/windows/store";
import { LabView, type LabViewProps } from "./lab-view";

// The Lab's window in the desktop, at the mockup's frame (652x480), drawn from props: every state, with no module and no fetch.
// The program is gero's examples/lang/fizzbuzz.gr as samples.json holds it in release v0.5.5; the other names are the manifest's.
const FIZZBUZZ = `-- fizzbuzz.gr — the classic, in Gero.
--
-- Prints 1..15, replacing multiples of 3 with "Fizz", of 5 with
-- "Buzz", and of both with "FizzBuzz". Exercises a \`for\` range loop,
-- the \`if\`/\`elif\`/\`else\` chain, the \`%\` operator, and \`print\` of both
-- integers and strings.
--
-- Run:
--   gero compile fizzbuzz.gr -o fizzbuzz.gx
--   gero run fizzbuzz.gx
def main()
  for i in 1..16
    if i % 15 == 0
      print "FizzBuzz"
    elif i % 3 == 0
      print "Fizz"
    elif i % 5 == 0
      print "Buzz"
    else
      print i
    end
  end
end
`;
const program = (name: string, lang: "gr" | "gas", text = ""): Program => ({ name, lang, entry: `${name}.${lang}`, files: [{ name: `${name}.${lang}`, text }] });
const PROGRAMS = [
  ...["collatz", "factorial", "fibonacci"].map((name) => program(name, "gr")),
  program("fizzbuzz", "gr", FIZZBUZZ),
  ...["gcd", "rock_paper_scissors", "shapes"].map((name) => program(name, "gr")),
  // `banks` is three files, the editor holds its `main.gas`: the picker names it by its name.
  { ...program("banks", "gas"), entry: "main.gas", files: [{ name: "bank0_greet.gas", text: "" }, { name: "bank1_excite.gas", text: "" }, { name: "main.gas", text: "" }] },
  ...["counter", "fib", "hello", "save"].map((name) => program(name, "gas")),
];
const OUTPUT = "Fizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz";

const base: LabViewProps = {
  version: "0.5.5",
  programs: PROGRAMS,
  program: PROGRAMS[3],
  text: FIZZBUZZ,
  onText: () => {},
  onPick: () => {},
  status: "idle",
  state: "",
  output: "",
  onRun: () => {},
  onStop: () => {},
  onReset: () => {},
};

function Lab({ view }: { view: Partial<LabViewProps> }) {
  // Once, before the first paint, so the window is there when the play function runs; Storybook's UI doesn't reset the store
  // between stories as Vitest does.
  const [registry] = useState(() => {
    useWindows.setState(useWindows.getInitialState(), true);
    useSettings.setState(DEFAULT_SETTINGS);
    useWindows.getState().setDesk({ w: 652, h: 456 });
    openLab();
    return { ...REGISTRY, lab: () => <LabView {...base} {...view} /> };
  });
  return <Desktop registry={registry} />;
}

const meta = {
  title: "OS/Lab",
  component: Lab,
  decorators: [
    (Story) => (
      <div className="h-120 w-163">
        <Crt>
          <Story />
        </Crt>
      </div>
    ),
  ],
} satisfies Meta<typeof Lab>;
export default meta;

type Story = StoryObj<typeof meta>;

const lab = (canvasElement: HTMLElement) => within(canvasElement).getByRole("dialog", { name: "Lab" });

/** The programs are still being fetched: nothing to show, nothing to run. */
export const Loading: Story = {
  args: { view: { programs: null, program: null, text: "" } },
  play: async ({ canvasElement }) => {
    const win = lab(canvasElement);
    await expect(within(win).getByRole("textbox", { name: "Program" })).toHaveAttribute("readonly");
    await expect(within(win).getByRole("button", { name: "Reset" })).toBeDisabled();
  },
};

/** Opened on fizzbuzz, before a run. */
export const Ready: Story = {
  args: { view: {} },
  play: async ({ canvasElement }) => {
    const win = lab(canvasElement);
    await expect(within(win).getByText("gero 0.5.5")).toBeInTheDocument();
    await expect(within(win).getByRole("button", { name: "Run" })).toBeInTheDocument();
  },
};

/** The program is running: the button is Stop, and the state is drawn but not announced. */
export const Running: Story = {
  args: { view: { status: "running", state: "running", output: "1\n2\nFizz\n4" } },
  play: async ({ canvasElement }) => {
    await expect(within(lab(canvasElement)).getByRole("button", { name: "Stop" })).toBeInTheDocument();
  },
};

/** After a run: the output, and how it ended. */
export const Halted: Story = {
  args: { view: { state: "halted, 1076 steps", output: OUTPUT } },
  play: async ({ canvasElement }) => {
    const win = lab(canvasElement);
    await expect(within(win).getByRole("status")).toHaveTextContent("halted, 1076 steps");
    await expect(within(win).getByRole("log", { name: "Output" })).toHaveTextContent("FizzBuzz");
  },
};

/** A build that fails prints its diagnostics as `gero check` words them. */
export const BuildError: Story = {
  args: { view: { state: "build failed", output: "error: expected expression [E_SYNTAX_MISSING_TOKEN]\n  --> fizzbuzz.gr:4:1" } },
  play: async ({ canvasElement }) => {
    await expect(within(lab(canvasElement)).getByRole("status")).toHaveTextContent("build failed");
  },
};

/** The picker open: Gero's programs, a separator, the assembly ones. */
export const PickerOpen: Story = {
  args: { view: { state: "halted, 1076 steps", output: OUTPUT } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(lab(canvasElement)).getByRole("button", { name: "fizzbuzz.gr" }));
    const items = await within(canvasElement).findAllByRole("menuitemradio");
    await expect(items).toHaveLength(12);
    await expect(within(canvasElement).getByRole("menuitemradio", { name: "fizzbuzz.gr" })).toHaveAttribute("aria-checked", "true");
  },
};
