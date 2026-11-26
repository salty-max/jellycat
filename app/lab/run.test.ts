// @vitest-environment node
// These run the real module, the pinned release scripts/gero-assets.mjs fetched into .cache/gero (Vitest's globalSetup runs it).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import expected from "./expected.json";
import { GERO_ASSETS, GERO_VERSION } from "./gero";
import { GeroModule, ModuleLoadError } from "./module";
import { CUT_NOTICE, describeOutcome, formatDiagnostics, OUTPUT_CAP, Output, Runner, STEP_CAP, type Program, type RunOutcome } from "./run";

const CACHE = join(import.meta.dirname, "..", "..", ".cache", "gero");
let wasm: Uint8Array<ArrayBuffer>;
let programs: Program[];

beforeAll(async () => {
  wasm = new Uint8Array(await readFile(join(CACHE, GERO_ASSETS.wasm.file)));
  const manifest = JSON.parse(await readFile(join(CACHE, GERO_ASSETS.samples.file), "utf8")) as { samples: { name: string; lang: string; entry: string; files: Record<string, string> }[] };
  programs = manifest.samples.map((s) => ({ name: s.name, lang: s.lang === "gr" ? "gr" : "gas", entry: s.entry, files: Object.entries(s.files).map(([name, text]) => ({ name, text })) }));
});

const load = () => GeroModule.instantiate(wasm);
const asm = (name: string, text: string): Program => ({ name, lang: "gas", entry: `${name}.gas`, files: [{ name: `${name}.gas`, text }] });
const ending = (runner: Runner, program: Program) => runner.run(program);

describe("the module", () => {
  test("reports the version the pin names", async () => {
    expect((await load()).version()).toBe(GERO_VERSION);
  });

  test("is started by load() whether the server says application/wasm or not", async () => {
    const serve = (type: string | null) => async () => new Response(new Uint8Array(wasm), { headers: type ? { "content-type": type } : {} });
    for (const type of ["application/wasm", "application/wasm; charset=binary", "application/octet-stream", null]) {
      expect((await GeroModule.load("/gero/x.wasm", 0, serve(type) as typeof fetch)).version(), String(type)).toBe(GERO_VERSION);
    }
  });

  test("fails to load as a ModuleLoadError: a refused fetch, a failed one, bytes that are not a module", async () => {
    const answer = (response: () => Response | Promise<Response>) => (async () => response()) as unknown as typeof fetch;
    await expect(GeroModule.load("/gero/x.wasm", 0, answer(() => new Response("", { status: 404 })))).rejects.toThrow(ModuleLoadError);
    await expect(GeroModule.load("/gero/x.wasm", 0, answer(() => Promise.reject(new TypeError("offline"))))).rejects.toThrow("could not fetch /gero/x.wasm");
    await expect(GeroModule.load("/gero/x.wasm", 0, answer(() => new Response("not wasm", { headers: { "content-type": "application/wasm" } })))).rejects.toThrow(ModuleLoadError);
    await expect(GeroModule.load("/gero/x.wasm", 0, answer(() => new Response("not wasm")))).rejects.toThrow(ModuleLoadError);
  });
});

describe("the programs", () => {
  test("are the twelve of gero's examples", () => {
    expect(programs.map((p) => p.name).toSorted()).toEqual(Object.keys(expected).toSorted());
  });

  test("every one builds and halts with the output gero's CI holds it to", async () => {
    const runner = new Runner(load);
    for (const program of programs) {
      let shown = "";
      const outcome = await runner.run(program, (text) => (shown = text));
      expect(outcome.kind, program.name).toBe("halted");
      expect(shown, program.name).toBe(expected[program.name as keyof typeof expected]);
    }
  });

  test("fizzbuzz halts in 1076 steps", async () => {
    const outcome = await ending(new Runner(load), programs.find((p) => p.name === "fizzbuzz")!);
    expect(outcome).toEqual({ kind: "halted", steps: 1076 });
    expect(describeOutcome(outcome)).toBe("halted, 1076 steps");
  });

  test("run again and again on one instance without the arena filling", async () => {
    const runner = new Runner(load);
    const fizzbuzz = programs.find((p) => p.name === "fizzbuzz")!;
    for (let run = 0; run < 150; run++) expect((await runner.run(fizzbuzz)).kind, `run ${run}`).toBe("halted");
  });
});

describe("a program that doesn't build", () => {
  test("says why as gero check does, and runs nothing", async () => {
    let shown = "";
    const broken: Program = { name: "broken", lang: "gr", entry: "broken.gr", files: [{ name: "broken.gr", text: "def main()\n  print 1 +\nend\n" }] };
    const outcome = await new Runner(load).run(broken, (text) => (shown = text));
    expect(outcome.kind).toBe("build-failed");
    expect(shown).toMatch(/^error: expected expression \[E_SYNTAX_MISSING_TOKEN\]\n {2}--> broken\.gr:2:12\n\nerror: /);
    expect(describeOutcome(outcome)).toBe("build failed");
  });

  test("in assembly too", async () => {
    let shown = "";
    await new Runner(load).run(asm("bad", "mov r1, wat\n"), (text) => (shown = text));
    expect(shown).toBe("error: undefined symbol [E004]\n  --> bad.gas:1:9");
  });

  test("the next run is unaffected", async () => {
    const runner = new Runner(load);
    expect((await runner.run(asm("bad", "mov r1, wat\n"))).kind).toBe("build-failed");
    expect((await runner.run(programs[0]!)).kind).toBe("halted");
  });
});

describe("diagnostics' wording", () => {
  test("code and help are printed when there are some, and a blank line separates two", () => {
    expect(
      formatDiagnostics([
        { severity: "error", message: "m", code: "E_X", file: "a.gr", line: 1, column: 2, help: "try this" },
        { severity: "warning", message: "w", file: "b.gr", line: 3, column: 4 },
      ]),
    ).toBe("error: m [E_X]\n  --> a.gr:1:2\n  help: try this\n\nwarning: w\n  --> b.gr:3:4");
  });
});

// A program that never ends, and one that prints for ever.
const SPIN = asm("spin", "main:\n.again:\n  jmp .again\n");
const PRINTER = asm("printer", "const PRINT = $10\nmain:\n  mov 'x', r1\n.again:\n  int PRINT\n  jmp .again\n");

// A print of 200 characters, over and over: within a slice it prints far more than the module's 16 KB print buffer holds.
const FLOODER: Program = { name: "flooder", lang: "gr", entry: "flooder.gr", files: [{ name: "flooder.gr", text: `def main()\n  while true\n    print "${"y".repeat(200)}"\n  end\nend\n` }] };

describe("a run that doesn't end", () => {
  test("says it cut when the module dropped output the host never saw, even under 64 KB", async () => {
    let shown = "";
    const outcome = await new Runner(load, { sliceSteps: 10_000, stepCap: 10_000, yielder: async () => {} }).run(FLOODER, (text) => (shown = text));
    expect(outcome.kind).toBe("stopped");
    expect(shown.startsWith(`${CUT_NOTICE}\nyyyy`)).toBe(true);
    expect(shown.length).toBeLessThan(OUTPUT_CAP);
  });

  test("stops by itself at 10,000,000 steps", async () => {
    const outcome = await new Runner(load, { yielder: async () => {} }).run(SPIN);
    expect(outcome).toEqual({ kind: "stopped", steps: STEP_CAP });
    expect(describeOutcome(outcome)).toBe("stopped after 10000000 steps");
  });

  test("stops between two slices when Stop is pressed, and the next run starts clean", async () => {
    const runner: Runner = new Runner(load, { sliceMs: 0, yielder: async (): Promise<void> => runner.stop() });
    const outcome = await runner.run(SPIN);
    expect(outcome.kind).toBe("stopped");
    expect((outcome as Extract<RunOutcome, { kind: "stopped" }>).steps).toBeGreaterThan(0);
    expect((outcome as Extract<RunOutcome, { kind: "stopped" }>).steps).toBeLessThan(STEP_CAP);
    expect(runner.isRunning).toBe(false);
    expect((await runner.run(programs[0]!)).kind).toBe("halted");
  });

  test("yields to the browser about every 8 ms, and not before", async () => {
    let clock = 0;
    let yields = 0;
    const runner = new Runner(load, { sliceSteps: 1_000, stepCap: 100_000, now: () => (clock += 1), yielder: async () => void yields++ });
    await runner.run(SPIN);
    // 100 calls, the clock moving 2 ms a call (one read to start the slice, one to check it): a yield after every 8 ms.
    expect(yields).toBeGreaterThan(10);
    expect(yields).toBeLessThan(40);
  });

  test("keeps the last 64 KB of what it printed and says it cut", async () => {
    let shown = "";
    const outcome = await new Runner(load, { stepCap: 300_000, yielder: async () => {} }).run(PRINTER, (text) => (shown = text));
    expect(outcome.kind).toBe("stopped");
    expect(shown.startsWith(`${CUT_NOTICE}\nx`)).toBe(true);
    expect(shown.length).toBe(CUT_NOTICE.length + 1 + OUTPUT_CAP);
  });

  test("refuses a second run while one is in progress", async () => {
    const runner = new Runner(load, { stepCap: 1_000_000, sliceMs: 0, yielder: () => new Promise((done) => setTimeout(done, 0)) });
    const first = runner.run(SPIN);
    await expect(runner.run(SPIN)).rejects.toThrow("already in progress");
    runner.stop();
    await first;
  });
});

describe("Output", () => {
  test("keeps everything under the cap, with no notice", () => {
    const output = new Output();
    output.append("a".repeat(OUTPUT_CAP));
    expect(output.text).toBe("a".repeat(OUTPUT_CAP));
  });

  test("keeps the end past it, and the notice goes first", () => {
    const output = new Output();
    output.append(`${"a".repeat(OUTPUT_CAP)}bc`);
    expect(output.text).toBe(`${CUT_NOTICE}\n${"a".repeat(OUTPUT_CAP - 2)}bc`);
  });

  test("never begins on half a surrogate pair", () => {
    const output = new Output();
    output.append(`😀${"a".repeat(OUTPUT_CAP - 1)}`);
    expect(output.text).toBe(`${CUT_NOTICE}\n${"a".repeat(OUTPUT_CAP - 1)}`);
  });
});

describe("a trap", () => {
  test("is printed, ends the run, and the next run starts a fresh instance", async () => {
    let loads = 0;
    const runner = new Runner(async () => {
      loads++;
      const module = await load();
      if (loads === 1) {
        module.vmStep = () => {
          throw new WebAssembly.RuntimeError("memory access out of bounds");
        };
      }
      return module;
    });
    let shown = "";
    const outcome = await runner.run(programs[0]!, (text) => (shown = text));
    expect(outcome).toEqual({ kind: "trapped", message: "memory access out of bounds" });
    expect(shown).toBe("gero.wasm stopped: memory access out of bounds");
    expect(describeOutcome(outcome)).toBe("gero.wasm stopped");
    expect(runner.isLoaded).toBe(false);

    expect((await runner.run(programs[0]!)).kind).toBe("halted");
    expect(loads).toBe(2);
  });
});

describe("a module that can't be loaded", () => {
  test("rejects the run, and the next run tries again", async () => {
    let loads = 0;
    const runner = new Runner(async () => {
      if (++loads === 1) throw new ModuleLoadError("could not fetch /gero/gero-0.5.5.wasm");
      return load();
    });
    await expect(runner.run(programs[0]!)).rejects.toThrow(ModuleLoadError);
    expect(runner.isRunning).toBe(false);
    expect((await runner.run(programs[0]!)).kind).toBe("halted");
  });
});
