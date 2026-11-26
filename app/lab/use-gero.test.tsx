import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { GERO_ASSETS, GERO_VERSION } from "./gero";
import { GeroModule, ModuleLoadError } from "./module";
import { Runner, type Program } from "./run";
import { COULD_NOT_LOAD_MODULE, COULD_NOT_LOAD_PROGRAMS, useGero } from "./use-gero";

const CACHE = join(import.meta.dirname, "..", "..", ".cache", "gero");
let wasm: Uint8Array<ArrayBuffer>;
let manifest: unknown;
beforeAll(async () => {
  wasm = new Uint8Array(await readFile(join(CACHE, GERO_ASSETS.wasm.file)));
  manifest = JSON.parse(await readFile(join(CACHE, GERO_ASSETS.samples.file), "utf8"));
});
afterEach(() => vi.unstubAllGlobals());

const serveManifest = (...answers: ("fail" | "ok")[]) => {
  const fetcher = vi.fn();
  for (const answer of answers) fetcher.mockResolvedValueOnce(answer === "ok" ? { ok: true, status: 200, json: async () => manifest } : { ok: false, status: 503 });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
};
const runnerOf = (load = () => GeroModule.instantiate(wasm), options = {}) => new Runner(load, { yielder: async () => {}, ...options });
const SPIN: Program = { name: "spin", lang: "gas", entry: "spin.gas", files: [{ name: "spin.gas", text: "main:\n.again:\n  jmp .again\n" }] };

// The programs' fetch is once a page load, so the failing and the succeeding case share one: the first mount fails, the reload works.
describe("useGero", () => {
  test("fetches the programs when it mounts, says when it could not, and fetches again on reload", async () => {
    const fetcher = serveManifest("fail", "ok");
    const runner = runnerOf();
    const { result } = renderHook(() => useGero(runner));
    expect(result.current.programs).toBeNull();
    await waitFor(() => expect(result.current.programsError).toBe(COULD_NOT_LOAD_PROGRAMS));
    expect(result.current.programs).toBeNull();

    act(() => result.current.reloadPrograms());
    await waitFor(() => expect(result.current.programs).toHaveLength(12));
    expect(result.current.programsError).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.version).toBe(GERO_VERSION);
  });

  test("runs a program: loading, then the output and how it ended", async () => {
    serveManifest("ok");
    const runner = runnerOf();
    const { result } = renderHook(() => useGero(runner));
    await waitFor(() => expect(result.current.programs).not.toBeNull());
    const fizzbuzz = result.current.programs!.find((p) => p.name === "fizzbuzz")!;

    act(() => result.current.run(fizzbuzz));
    expect(result.current.status).toBe("loading");
    expect(result.current.state).toBe("loading gero.wasm");
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.state).toBe("halted, 1076 steps");
    expect(result.current.output).toMatch(/^1\n2\nFizz\n/);
    expect(result.current.output).toMatch(/FizzBuzz\n$/);
  });

  test("says so when the module could not be loaded, and the next run tries again", async () => {
    serveManifest("ok");
    let loads = 0;
    const runner = runnerOf(async () => {
      if (++loads === 1) throw new ModuleLoadError("could not fetch /gero/gero-0.5.5.wasm");
      return GeroModule.instantiate(wasm);
    });
    const { result } = renderHook(() => useGero(runner));
    await waitFor(() => expect(result.current.programs).not.toBeNull());
    const [first] = result.current.programs!;

    act(() => result.current.run(first!));
    await waitFor(() => expect(result.current.state).toBe(COULD_NOT_LOAD_MODULE));
    expect(result.current.status).toBe("idle");

    act(() => result.current.run(first!));
    await waitFor(() => expect(result.current.state).toMatch(/^halted, \d+ steps$/));
  });

  test("a build error is printed in the output, with its state", async () => {
    serveManifest("ok");
    const runner = runnerOf();
    const { result } = renderHook(() => useGero(runner));
    await waitFor(() => expect(result.current.programs).not.toBeNull());
    act(() => result.current.run({ name: "bad", lang: "gas", entry: "bad.gas", files: [{ name: "bad.gas", text: "mov r1, wat\n" }] }));
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.output).toBe("error: undefined symbol [E004]\n  --> bad.gas:1:9");
    expect(result.current.state).toBe("build failed");
  });

  test("Stop ends a run that doesn't end, after its current slice", async () => {
    serveManifest("ok");
    const runner = runnerOf(undefined, { sliceMs: 0, yielder: () => new Promise((done) => setTimeout(done, 0)) });
    const { result } = renderHook(() => useGero(runner));
    await waitFor(() => expect(result.current.programs).not.toBeNull());
    act(() => result.current.run(SPIN));
    await waitFor(() => expect(result.current.status).toBe("running"));
    act(() => result.current.stop());
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.state).toMatch(/^stopped after \d+ steps$/);
  });

  test("Reset ends a run and clears the output and the state", async () => {
    serveManifest("ok");
    const runner = runnerOf();
    const { result } = renderHook(() => useGero(runner));
    await waitFor(() => expect(result.current.programs).not.toBeNull());
    act(() => result.current.run(result.current.programs![0]!));
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.output).not.toBe("");
    act(() => result.current.reset());
    expect(result.current).toMatchObject({ status: "idle", state: "", output: "" });
  });

  test("a Run pressed after Reset, while the run it ended is still ending, is not lost", async () => {
    serveManifest("ok");
    const runner = runnerOf(undefined, { sliceMs: 0, yielder: () => new Promise((done) => setTimeout(done, 0)) });
    const { result } = renderHook(() => useGero(runner));
    await waitFor(() => expect(result.current.programs).not.toBeNull());
    const [first] = result.current.programs!;
    act(() => result.current.run(SPIN));
    await waitFor(() => expect(result.current.status).toBe("running"));
    act(() => result.current.reset());
    act(() => result.current.run(first!));
    await waitFor(() => expect(result.current.state).toMatch(/^halted, \d+ steps$/));
  });

  test("closing the window stops the run that followed a Reset, not only the first", async () => {
    serveManifest("ok");
    const runner = runnerOf(undefined, { sliceMs: 0, yielder: () => new Promise((done) => setTimeout(done, 0)) });
    const { result, unmount } = renderHook(() => useGero(runner));
    await waitFor(() => expect(result.current.programs).not.toBeNull());
    act(() => result.current.run(SPIN));
    await waitFor(() => expect(result.current.status).toBe("running"));
    act(() => result.current.reset());
    act(() => result.current.run(SPIN));
    await waitFor(() => expect(result.current.status).toBe("running"));
    await new Promise((done) => setTimeout(done, 30));
    unmount();
    await waitFor(() => expect(runner.isRunning).toBe(false));
  });

  test("closing a window stops only a run that window started", async () => {
    serveManifest("ok");
    const runner = runnerOf(undefined, { sliceMs: 0, yielder: () => new Promise((done) => setTimeout(done, 0)) });
    const starter = renderHook(() => useGero(runner));
    const other = renderHook(() => useGero(runner));
    await waitFor(() => expect(starter.result.current.programs).not.toBeNull());
    act(() => starter.result.current.run(SPIN));
    await waitFor(() => expect(starter.result.current.status).toBe("running"));
    other.unmount();
    await new Promise((done) => setTimeout(done, 30));
    expect(runner.isRunning).toBe(true);
    starter.unmount();
    await waitFor(() => expect(runner.isRunning).toBe(false));
  });

  test("closing the window stops its run", async () => {
    serveManifest("ok");
    const runner = runnerOf(undefined, { sliceMs: 0, yielder: () => new Promise((done) => setTimeout(done, 0)) });
    const { result, unmount } = renderHook(() => useGero(runner));
    await waitFor(() => expect(result.current.programs).not.toBeNull());
    act(() => result.current.run(SPIN));
    await waitFor(() => expect(result.current.status).toBe("running"));
    unmount();
    await waitFor(() => expect(runner.isRunning).toBe(false));
  });
});
