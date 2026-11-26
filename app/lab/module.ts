// A typed binding over gero.wasm, ported from gero-lab's src/worker/module.ts (https://github.com/salty-max/gero-lab), cut down
// to the calls the Lab makes: files, build, check, and the VM's create, load, reset, step, take output and destroy. Both
// repositories are the same author's; the notice gero-lab's license asks for:
//
//   MIT License
//
//   Copyright (c) 2026 Maxime Blanc
//
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
//   files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,
//   modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
//   is furnished to do so, subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
//   WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
//   COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
//   ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// The module takes no imports and holds no state the host doesn't put there. A pointer it takes or returns is an offset from
// gero_arena_base(), a `Result` is five little-endian u32s, and the memory buffer detaches whenever the module grows, so a view
// is made afresh for each read. None of the toolchain or the VM is here: every operation is a call into the module.

/** `Result`'s five u32s: status, payload pointer and length, diagnostics pointer and length. */
const RESULT_SIZE = 20;

/** A step's outcome: four u32s, the reason it stopped, the instruction pointer, the fault vector, the instructions retired. */
const STEP_OUTCOME_SIZE = 16;

/** `abi.Status`: what a call answers, fixed by the module. */
export const Status = { ok: 0, diagnostics: 1, notInitialized: 2, outOfMemory: 3, badLang: 4, badPointer: 5 } as const;

/** `vm.StepReason`: why a slice of steps stopped. */
export const StepReason = { budget: 0, halted: 1, breakpoint: 2, faulted: 3, notLoaded: 4 } as const;

/** The two source languages: assembly and Gero, in the module's own numbering. */
export const LangCode = { gas: 0, gr: 1 } as const;
export type Lang = keyof typeof LangCode;

export interface SourceFile {
  name: string;
  text: string;
}

export interface StepOutcome {
  reason: number;
  ip: number;
  fault: number;
  steps: number;
}

export interface ModuleResult {
  status: number;
  payload: Uint8Array | null;
  diagnosticsJson: string | null;
  /** The raw length word of the diagnostics slot: a take of the VM's output uses it for the bytes the program printed past the buffer. */
  diagnosticsLen: number;
}

interface Exports {
  memory: WebAssembly.Memory;
  gero_init(arenaBytes: number): number;
  gero_reset(): void;
  gero_alloc(len: number): number;
  gero_arena_base(): number;
  gero_result_size(): number;
  gero_version(): number;
  gero_file_put(namePtr: number, nameLen: number, srcPtr: number, srcLen: number): number;
  gero_files_clear(): void;
  gero_check(namePtr: number, nameLen: number, lang: number): number;
  gero_compile(namePtr: number, nameLen: number): number;
  gero_assemble(namePtr: number, nameLen: number): number;
  gero_vm_create(): number;
  gero_vm_destroy(handle: number): number;
  gero_vm_load(handle: number, ptr: number, len: number): number;
  gero_vm_reset(handle: number): number;
  gero_vm_step(handle: number, budget: number): number;
  gero_vm_take_output(handle: number): number;
}

/** A call the module answered with a status the caller can't go on from. */
export class ModuleError extends Error {
  readonly status: number;
  constructor(status: number, what: string) {
    super(`${what}: module status ${status}`);
    this.name = "ModuleError";
    this.status = status;
  }
}

/** The module could not be fetched or is not a WebAssembly module: the Lab says it could not load it. */
export class ModuleLoadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ModuleLoadError";
  }
}

export class GeroModule {
  private readonly decoder = new TextDecoder();
  private readonly encoder = new TextEncoder();
  // The output is decoded as a stream, so a character a program prints across two slices isn't split in two; each VM starts afresh.
  private outputDecoder = new TextDecoder();

  private constructor(private readonly ex: Exports) {}

  /**
   * Compile and start a module from its bytes. `arenaBytes` 0 is the module's default arena (a 16 MiB limit).
   * Compiling WebAssembly needs 'wasm-unsafe-eval' in the page's `script-src` (scripts/csp.ts).
   */
  static async instantiate(source: BufferSource, arenaBytes = 0): Promise<GeroModule> {
    const { instance } = await WebAssembly.instantiate(source, {});
    return GeroModule.start(instance, arenaBytes);
  }

  /**
   * Fetch the module from `url` and start it. Compiles while the bytes arrive (`instantiateStreaming`) when the server says
   * `application/wasm`; otherwise reads them whole, since the streaming call refuses any other type.
   */
  static async load(url: string, arenaBytes = 0, fetcher: typeof fetch = fetch): Promise<GeroModule> {
    let response: Response;
    try {
      response = await fetcher(url);
    } catch (error) {
      throw new ModuleLoadError(`could not fetch ${url}`, { cause: error });
    }
    if (!response.ok) throw new ModuleLoadError(`could not fetch ${url}: ${response.status}`);
    try {
      const streams = typeof WebAssembly.instantiateStreaming === "function" && response.headers.get("content-type")?.toLowerCase() === "application/wasm";
      const { instance } = streams ? await WebAssembly.instantiateStreaming(response, {}) : await WebAssembly.instantiate(await response.arrayBuffer(), {});
      return GeroModule.start(instance, arenaBytes);
    } catch (error) {
      throw new ModuleLoadError(`could not start ${url}`, { cause: error });
    }
  }

  private static start(instance: WebAssembly.Instance, arenaBytes: number): GeroModule {
    const ex = instance.exports as unknown as Exports;
    const status = ex.gero_init(arenaBytes);
    if (status !== Status.ok) throw new ModuleError(status, "gero_init");
    if (ex.gero_result_size() !== RESULT_SIZE) throw new ModuleError(Status.badPointer, "gero_result_size");
    return new GeroModule(ex);
  }

  /** A fresh view each time: the buffer detaches when the module grows, so a held view reads the wrong bytes. */
  private get view(): DataView {
    return new DataView(this.ex.memory.buffer);
  }

  /** An arena offset is not a linear-memory address: it is that offset past gero_arena_base(). */
  private absolute(ptr: number): number {
    return this.ex.gero_arena_base() + ptr;
  }

  private bytesAt(ptr: number, len: number): Uint8Array {
    // An empty payload is normal (a slice that printed nothing), and its pointer may sit at the arena's high-water mark, a valid
    // offset but not a valid origin for a view.
    if (len === 0) return new Uint8Array(0);
    // Copied, not a subarray: the module may grow, which detaches the buffer under a held view.
    return new Uint8Array(this.ex.memory.buffer, this.absolute(ptr), len).slice();
  }

  /** What the `*const Result` an export returned says. The pointers inside it are arena offsets. */
  private result(ptr: number): ModuleResult {
    const view = this.view;
    const payloadPtr = view.getUint32(ptr + 4, true);
    const payloadLen = view.getUint32(ptr + 8, true);
    const diagnosticsPtr = view.getUint32(ptr + 12, true);
    const diagnosticsLen = view.getUint32(ptr + 16, true);
    return {
      status: view.getUint32(ptr, true),
      payload: payloadPtr === 0 ? null : this.bytesAt(payloadPtr, payloadLen),
      diagnosticsJson: diagnosticsPtr === 0 ? null : this.decoder.decode(this.bytesAt(diagnosticsPtr, diagnosticsLen)),
      diagnosticsLen,
    };
  }

  /** Copy bytes into the arena and return their offset. */
  private put(bytes: Uint8Array): number {
    const ptr = this.ex.gero_alloc(bytes.length);
    if (ptr === 0 && bytes.length > 0) throw new ModuleError(Status.outOfMemory, "gero_alloc");
    new Uint8Array(this.ex.memory.buffer).set(bytes, this.absolute(ptr));
    return ptr;
  }

  private putText(text: string): { ptr: number; len: number } {
    const bytes = this.encoder.encode(text);
    return { ptr: this.put(bytes), len: bytes.length };
  }

  /** Drop what the arena holds: the inputs written and the last result. A host does it once it is done with them. */
  reset(): void {
    this.ex.gero_reset();
  }

  /** The gero version the module was built from (`0.5.5`). */
  version(): string {
    const { payload } = this.result(this.ex.gero_version());
    return payload ? this.decoder.decode(payload) : "unknown";
  }

  /** Replace the virtual files a build reads (a program of several files is one set). */
  putFiles(files: readonly SourceFile[]): void {
    this.ex.gero_files_clear();
    for (const file of files) {
      const name = this.putText(file.name);
      const text = this.putText(file.text);
      const status = this.ex.gero_file_put(name.ptr, name.len, text.ptr, text.len);
      if (status !== Status.ok) throw new ModuleError(status, `gero_file_put(${file.name})`);
    }
  }

  /** Build the entry file (already in the set) into an image: its `payload`, or `diagnosticsJson` when it doesn't build. */
  build(entry: string, lang: Lang): ModuleResult {
    const name = this.putText(entry);
    return this.result(lang === "gr" ? this.ex.gero_compile(name.ptr, name.len) : this.ex.gero_assemble(name.ptr, name.len));
  }

  /** Diagnostics for the entry, without building an image. */
  check(entry: string, lang: Lang): ModuleResult {
    const name = this.putText(entry);
    return this.result(this.ex.gero_check(name.ptr, name.len, LangCode[lang]));
  }

  vmCreate(): number {
    this.outputDecoder = new TextDecoder();
    return this.ex.gero_vm_create();
  }

  vmDestroy(handle: number): void {
    this.ex.gero_vm_destroy(handle);
  }

  vmLoad(handle: number, image: Uint8Array): ModuleResult {
    const ptr = this.put(image);
    return this.result(this.ex.gero_vm_load(handle, ptr, image.length));
  }

  /** Boot the loaded image again. */
  vmReset(handle: number): void {
    this.ex.gero_vm_reset(handle);
  }

  /** Retire up to `budget` instructions; the outcome says why it stopped. */
  vmStep(handle: number, budget: number): StepOutcome {
    const { status, payload } = this.result(this.ex.gero_vm_step(handle, budget));
    if (!payload || payload.length < STEP_OUTCOME_SIZE) throw new ModuleError(status, "gero_vm_step");
    const view = new DataView(payload.buffer, payload.byteOffset);
    return { reason: view.getUint32(0, true), ip: view.getUint32(4, true), fault: view.getUint32(8, true), steps: view.getUint32(12, true) };
  }

  /**
   * What the program printed since the last call, empty when nothing, and how many bytes it printed past the VM's print buffer
   * (16 KB) and the module dropped: a program that prints a long string in a loop outruns it within one slice.
   */
  vmTakeOutput(handle: number): { text: string; dropped: number } {
    const { payload, diagnosticsLen } = this.result(this.ex.gero_vm_take_output(handle));
    return { text: payload ? this.outputDecoder.decode(payload, { stream: true }) : "", dropped: diagnosticsLen };
  }
}
