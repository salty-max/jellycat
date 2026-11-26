import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { GERO_ASSETS, GERO_VERSION } from "../../lab/gero";
import { GeroModule, ModuleLoadError } from "../../lab/module";
import { Runner, type Program } from "../../lab/run";
import { createSamplesLoader } from "../../lab/samples";
import { LabWindow } from "./lab-window";

// The programs' fetch is once a page load, through the samples module's shared loader: each test swaps in a loader of its own.
let loader: () => Promise<Program[]>;
vi.mock("../../lab/samples", async (original) => ({ ...(await original<typeof import("../../lab/samples")>()), loadSamples: () => loader() }));

// The window against the real module in .cache/gero/ (scripts/gero-assets.mjs), as the Lab's other tests drive it: no mock of gero.
const CACHE = join(import.meta.dirname, "..", "..", "..", ".cache", "gero");
let wasm: Uint8Array<ArrayBuffer>;
let manifest: unknown;
beforeAll(async () => {
  wasm = new Uint8Array(await readFile(join(CACHE, GERO_ASSETS.wasm.file)));
  manifest = JSON.parse(await readFile(join(CACHE, GERO_ASSETS.samples.file), "utf8"));
});

const SPIN = "main:\n.again:\n  jmp .again\n";
const SLOW = { sliceMs: 0, yielder: () => new Promise<void>((done) => setTimeout(done, 0)) };

/** Renders the window with the programs' fetch answering as listed (`fail`, then `ok`...), and a runner on the real module. */
function open(answers: ("fail" | "ok")[] = ["ok"], options: ConstructorParameters<typeof Runner>[1] = { yielder: async () => {} }, load = () => GeroModule.instantiate(wasm)) {
  const fetcher = vi.fn();
  for (const answer of answers) fetcher.mockResolvedValueOnce(answer === "ok" ? { ok: true, status: 200, json: async () => manifest } : { ok: false, status: 503 });
  loader = createSamplesLoader("/programs.json", fetcher);
  render(<LabWindow windowId="lab" runner={new Runner(load, options)} />);
  return { user: userEvent.setup(), fetcher };
}

const editor = () => screen.getByRole("textbox", { name: "Program" }) as HTMLTextAreaElement;
const state = () => screen.getByRole("status").textContent;
const loaded = () => waitFor(() => expect(editor().value).not.toBe(""));
const edit = (text: string) => fireEvent.change(editor(), { target: { value: text } });

describe("the Lab's window", () => {
  test("opens on fizzbuzz, with the file in the info line and the pinned version", async () => {
    open();
    await loaded();
    expect(screen.getByText("fizzbuzz.gr", { selector: ".app-info span" })).toBeInTheDocument();
    expect(screen.getByText(`gero ${GERO_VERSION}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "fizzbuzz.gr" })).toBeInTheDocument();
    expect(editor().value).toMatch(/^-- fizzbuzz\.gr/);
    expect(editor()).toHaveAttribute("spellcheck", "false");
    expect(editor()).toHaveAttribute("wrap", "off");
    expect(screen.getByRole("log", { name: "Output" })).toHaveAttribute("aria-live", "off");
  });

  test("Run prints the program's output and says how it ended; the button is Stop while it runs", async () => {
    const { user } = open();
    await loaded();
    await user.click(screen.getByRole("button", { name: "Run" }));
    await waitFor(() => expect(state()).toBe("halted, 1076 steps"));
    const log = screen.getByRole("log", { name: "Output" });
    expect(log.textContent).toMatch(/^1\n2\nFizz\n/);
    expect(log.textContent).toMatch(/FizzBuzz\n$/);
    expect(screen.getByRole("button", { name: "Run" })).toHaveFocus();
  });

  test("a build that fails prints its diagnostics as gero check words them", async () => {
    const { user } = open();
    await loaded();
    edit("def main(\n");
    await user.click(screen.getByRole("button", { name: "Run" }));
    await waitFor(() => expect(state()).toBe("build failed"));
    expect(screen.getByRole("log", { name: "Output" }).textContent).toMatch(/^error: .+ \[E_[A-Z_]+\]\n {2}--> fizzbuzz\.gr:\d+:\d+/);
  });

  test("Ctrl+Enter in the editor runs, and Tab is not taken", async () => {
    const { user } = open();
    await loaded();
    await user.click(editor());
    await user.keyboard("{Control>}{Enter}{/Control}");
    await waitFor(() => expect(state()).toBe("halted, 1076 steps"));

    // Tab is left to the browser: the editor doesn't take it.
    expect(fireEvent.keyDown(editor(), { key: "Tab" })).toBe(true);
  });

  test("Enter on the window runs", async () => {
    open();
    await loaded();
    const root = document.querySelector<HTMLElement>(".app-lab")!;
    root.focus();
    fireEvent.keyDown(root, { key: "Enter" });
    await waitFor(() => expect(state()).toBe("halted, 1076 steps"));
  });

  test("Stop ends a program that doesn't end, and takes the focus while it runs", async () => {
    const { user } = open(["ok"], SLOW);
    await loaded();
    await user.click(screen.getByRole("button", { name: "fizzbuzz.gr" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "hello.gas" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "hello.gas" })).toBeInTheDocument());
    edit(SPIN);
    await user.click(screen.getByRole("button", { name: "Run" }));
    const stop = await screen.findByRole("button", { name: "Stop" });
    expect(stop).toHaveFocus();
    await user.click(stop);
    await waitFor(() => expect(state()).toMatch(/^stopped after \d+ steps$/));
    // Stop ended it, not the cap.
    expect(Number(/\d+/.exec(state() ?? "")?.[0])).toBeLessThan(10_000_000);
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
  });

  test("the picker lists Gero's seven, then the assembly five, the picked one checked", async () => {
    const { user } = open();
    await loaded();
    await user.click(screen.getByRole("button", { name: "fizzbuzz.gr" }));
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual([
      "collatz.gr",
      "factorial.gr",
      "fibonacci.gr",
      "fizzbuzz.gr",
      "gcd.gr",
      "rock_paper_scissors.gr",
      "shapes.gr",
      "banks",
      "counter.gas",
      "fib.gas",
      "hello.gas",
      "save.gas",
    ]);
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(within(screen.getByRole("menuitemradio", { name: "fizzbuzz.gr" })).queryByText("", { selector: ".menubar-mark" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "fizzbuzz.gr" })).toHaveAttribute("aria-checked", "true");
  });

  test("picking another program shows its text and clears the last run", async () => {
    const { user } = open();
    await loaded();
    await user.click(screen.getByRole("button", { name: "Run" }));
    await waitFor(() => expect(state()).toBe("halted, 1076 steps"));
    await user.click(screen.getByRole("button", { name: "fizzbuzz.gr" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "gcd.gr" }));
    await waitFor(() => expect(editor().value).toMatch(/^-- gcd\.gr/));
    expect(screen.getByRole("button", { name: "gcd.gr" })).toBeInTheDocument();
    expect(state()).toBe("");
    expect(screen.getByRole("log", { name: "Output" })).toHaveTextContent("");
  });

  test("an edit stays while the window is open, and Reset puts the program's own text back and clears the output", async () => {
    const { user } = open();
    await loaded();
    const original = editor().value;
    edit("def main()\nend\n");
    await user.click(screen.getByRole("button", { name: "fizzbuzz.gr" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "gcd.gr" }));
    await user.click(screen.getByRole("button", { name: "gcd.gr" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "fizzbuzz.gr" }));
    await waitFor(() => expect(editor().value).toBe("def main()\nend\n"));

    await user.click(screen.getByRole("button", { name: "Run" }));
    await waitFor(() => expect(state()).toMatch(/^halted, \d+ steps?$/));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(editor().value).toBe(original);
    expect(state()).toBe("");
  });

  test("when the programs can't be fetched it says so, and Run fetches them again", async () => {
    const { user, fetcher } = open(["fail", "ok"]);
    await waitFor(() => expect(state()).toBe("could not load the programs"));
    expect(editor()).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "-" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Run" }));
    await loaded();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(state()).toBe("");
  });

  test("a module that can't be fetched is said in the state line", async () => {
    const { user } = open(["ok"], { yielder: async () => {} }, async () => {
      throw new ModuleLoadError("could not fetch /gero/gero-0.5.5.wasm");
    });
    await loaded();
    await user.click(screen.getByRole("button", { name: "Run" }));
    await waitFor(() => expect(state()).toBe("could not load gero.wasm"));
  });
});

describe("the Lab's chunk", () => {
  test("a window whose code could not be loaded says so, and the next one loads it", async () => {
    const { COULD_NOT_LOAD_LAB, LabApp } = await import("./lab-app");
    const failing = () => Promise.reject(new Error("Failed to fetch dynamically imported module"));
    const first = render(<LabApp windowId="lab" load={failing} />);
    expect(await screen.findByText(COULD_NOT_LOAD_LAB)).toBeInTheDocument();
    first.unmount();

    const working = () => Promise.resolve(() => <p>the window</p>);
    render(<LabApp windowId="lab" load={working} />);
    expect(await screen.findByText("the window")).toBeInTheDocument();
  });
});
