// A run, from a program's files to how it ended: build, load into a VM, step in slices, collect what it printed.
//
// There is no worker (docs/phase-2.md): every sample builds and runs in milliseconds, so the run stays on the main thread. It
// steps 10,000 instructions at a time until about 8 ms have gone, then yields to the browser, so a click on Stop is heard between
// two slices, and a run is capped at 10,000,000 instructions so a loop typed in the editor can't freeze the page. The output
// keeps its last 64 KB, so a program printing in a loop can't fill it either.
import { GeroModule, Status, StepReason, type Lang, type SourceFile } from "./module";

export const SLICE_STEPS = 10_000;
export const SLICE_MS = 8;
export const STEP_CAP = 10_000_000;
export const OUTPUT_CAP = 64 * 1024;
export const CUT_NOTICE = "output cut to the last 64 KB";

/** A program as `samples.json` holds it: its files, the one a build starts from, and its language. */
export interface Program {
  name: string;
  lang: Lang;
  entry: string;
  files: SourceFile[];
}

/** One diagnostic, in the shape the module (and `gero check --format=json`) writes. `help` is the line the CLI prints under it. */
export interface Diagnostic {
  code?: string;
  message: string;
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning" | "note";
  help?: string;
}

/** How a run ended. */
export type RunOutcome =
  | { kind: "halted"; steps: number }
  /** Stop was pressed, or the run reached the cap. */
  | { kind: "stopped"; steps: number }
  | { kind: "faulted"; ip: number; steps: number }
  | { kind: "build-failed"; diagnostics: Diagnostic[] }
  /** The module trapped or refused a call; its instance is dropped and the next run starts a fresh one. */
  | { kind: "trapped"; message: string };

const steps = (count: number): string => `${count} ${count === 1 ? "step" : "steps"}`;

/** The state line's words for an outcome: `halted, 1076 steps`, `stopped after 10000000 steps`, `faulted at $0123`. */
export function describeOutcome(outcome: RunOutcome): string {
  switch (outcome.kind) {
    case "halted":
      return `halted, ${steps(outcome.steps)}`;
    case "stopped":
      return `stopped after ${steps(outcome.steps)}`;
    case "faulted":
      return `faulted at $${outcome.ip.toString(16).toUpperCase().padStart(4, "0")}`;
    case "build-failed":
      return "build failed";
    case "trapped":
      return "gero.wasm stopped";
  }
}

/** The module's diagnostics as `gero check` words them: `error: <message> [<code>]`, then `  --> <file>:<line>:<column>`. */
export function formatDiagnostics(diagnostics: readonly Diagnostic[]): string {
  return diagnostics
    .map((d) => [`${d.severity}: ${d.message}${d.code ? ` [${d.code}]` : ""}`, `  --> ${d.file}:${d.line}:${d.column}`, ...(d.help ? [`  help: ${d.help}`] : [])].join("\n"))
    .join("\n\n");
}

function parseDiagnostics(json: string | null): Diagnostic[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as Diagnostic[]) : [];
  } catch {
    // A diagnostics array that isn't JSON is the module's bug, and the status still says the build failed.
    return [];
  }
}

/** The last `OUTPUT_CAP` characters of what a program printed, and whether anything before them was dropped. */
export class Output {
  private kept = "";
  private cut = false;

  /** `dropped`: bytes the module couldn't hold and lost before the host took them, which is a cut as well. */
  append(text: string, dropped = 0): void {
    this.kept += text;
    if (dropped > 0) this.cut = true;
    if (this.kept.length <= OUTPUT_CAP) return;
    let from = this.kept.length - OUTPUT_CAP;
    // Never start on the second half of a surrogate pair.
    const unit = this.kept.charCodeAt(from);
    if (unit >= 0xdc00 && unit <= 0xdfff) from++;
    this.kept = this.kept.slice(from);
    this.cut = true;
  }

  /** What the pane shows: the notice on its own line first when the start was cut. */
  get text(): string {
    return this.cut ? `${CUT_NOTICE}\n${this.kept}` : this.kept;
  }
}

/** Gives the browser the turn: `scheduler.yield` where there is one, a timer where there isn't. */
function yieldToBrowser(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return scheduler?.yield ? scheduler.yield() : new Promise((done) => setTimeout(done, 0));
}

export interface RunnerOptions {
  /** How many instructions a call to the module may retire. */
  sliceSteps?: number;
  /** How long a run steps before it yields, in milliseconds. */
  sliceMs?: number;
  /** Where a run stops by itself, in instructions. */
  stepCap?: number;
  now?: () => number;
  yielder?: () => Promise<void>;
}

/**
 * Runs programs on one instance of the module, loaded by `load` on the first run and again after a trap. A load that fails
 * throws (so the window can say it could not load gero.wasm) and is tried again on the next run. One run at a time: Run is
 * Stop while it runs.
 */
export class Runner {
  private module: GeroModule | null = null;
  private stopRequested = false;
  private running = false;
  private idle: Promise<void> = Promise.resolve();
  private readonly sliceSteps: number;
  private readonly sliceMs: number;
  private readonly stepCap: number;
  private readonly now: () => number;
  private readonly yielder: () => Promise<void>;

  constructor(
    private readonly load: () => Promise<GeroModule>,
    options: RunnerOptions = {},
  ) {
    this.sliceSteps = options.sliceSteps ?? SLICE_STEPS;
    this.sliceMs = options.sliceMs ?? SLICE_MS;
    this.stepCap = options.stepCap ?? STEP_CAP;
    this.now = options.now ?? (() => performance.now());
    this.yielder = options.yielder ?? yieldToBrowser;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Whether the module is loaded: the next run starts at once, where the first one fetches gero.wasm. */
  get isLoaded(): boolean {
    return this.module !== null;
  }

  /** Resolves once no run is in progress (at once when none is): a run stopped a moment ago still ends its slice. */
  whenIdle(): Promise<void> {
    return this.idle;
  }

  /** Ends the run in progress after its current slice, as `stopped`. */
  stop(): void {
    if (this.running) this.stopRequested = true;
  }

  /**
   * Builds and runs a program. `onOutput` is given everything the pane should show (the notice for a cut included) each time a
   * slice has printed, and once more at the end. Rejects when the module can't be loaded; every other failure is an outcome.
   */
  async run(program: Program, onOutput: (text: string) => void = () => {}): Promise<RunOutcome> {
    if (this.running) throw new Error("a run is already in progress");
    this.running = true;
    this.stopRequested = false;
    let release = () => {};
    this.idle = new Promise((done) => (release = done));
    const output = new Output();
    let handle = 0;
    try {
      this.module ??= await this.load();
      const module = this.module;
      try {
        // Each run starts from an empty arena: the inputs of the last one would fill it a run at a time.
        module.reset();
        module.putFiles(program.files);
        const built = module.build(program.entry, program.lang);
        if (built.status !== Status.ok || !built.payload) {
          const diagnostics = parseDiagnostics(built.diagnosticsJson);
          output.append(diagnostics.length > 0 ? formatDiagnostics(diagnostics) : `the build failed: module status ${built.status}`);
          onOutput(output.text);
          return { kind: "build-failed", diagnostics };
        }
        handle = module.vmCreate();
        const loaded = module.vmLoad(handle, built.payload);
        if (loaded.status !== Status.ok) throw new Error(`the image would not load: module status ${loaded.status}`);
        return await this.step(module, handle, output, onOutput);
      } catch (error) {
        // A trap (say a stack overflow) leaves the instance in an unknown state: drop it, and the next run starts a fresh one.
        this.module = null;
        handle = 0;
        const message = error instanceof Error ? error.message : String(error);
        output.append(`${output.text === "" ? "" : "\n"}gero.wasm stopped: ${message}`);
        onOutput(output.text);
        return { kind: "trapped", message };
      }
    } finally {
      if (handle !== 0) this.module?.vmDestroy(handle);
      this.running = false;
      release();
    }
  }

  private async step(module: GeroModule, handle: number, output: Output, onOutput: (text: string) => void): Promise<RunOutcome> {
    let total = 0;
    let sliceStart = this.now();
    for (;;) {
      if (this.stopRequested || total >= this.stepCap) {
        onOutput(output.text);
        return { kind: "stopped", steps: total };
      }
      const outcome = module.vmStep(handle, Math.min(this.sliceSteps, this.stepCap - total));
      total += outcome.steps;
      const printed = module.vmTakeOutput(handle);
      if (printed.text !== "" || printed.dropped > 0) output.append(printed.text, printed.dropped);

      if (outcome.reason === StepReason.halted) {
        onOutput(output.text);
        return { kind: "halted", steps: total };
      }
      if (outcome.reason === StepReason.faulted) {
        onOutput(output.text);
        return { kind: "faulted", ip: outcome.ip, steps: total };
      }
      if (outcome.reason !== StepReason.budget) throw new Error(`the module stopped the run for reason ${outcome.reason}`);

      if (this.now() - sliceStart >= this.sliceMs) {
        onOutput(output.text);
        await this.yielder();
        sliceStart = this.now();
      }
    }
  }
}
