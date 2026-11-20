# Gero

Gero is a 16-bit virtual machine and the toolchain that targets it, in Zig with no runtime dependencies: one `gero` binary assembles, compiles, runs, disassembles, formats, tests and benchmarks programs, and serves as a language server. A program ships as one `.gx` bytecode file, byte for byte the same wherever it's built, in a frozen format: a file built for another major version of the format is refused, never run. Gero Lab, the playground at the project's link, runs the same toolchain in the browser.

## How it's built

The machine is in the line of the 6502, Z80 and 8086: 15 sixteen-bit registers, variable-length instructions, 64 KB of address space with a 16 KB window that switches between banks, and no floating point.

The language reads like Lua but compiles ahead of time to the assembler's bytecode, with types checked first: `Vec(T)`, tuples, enums with payloads, `T?` optionals, and a `match` that won't compile if it misses a variant. The specifications in `docs/` (the ISA, both languages, the diagnostics, the CLI, versioning) are the source of truth and change in the same pull request as the code.

Gero Lab holds no VM logic of its own: every assemble, compile, format and step goes through `gero.wasm`, a build target of the Gero repository. The page reaches it through a worker with a versioned protocol and runs a program in slices of a fixed instruction budget, so a tight loop can't freeze the page. A program is shared as a link whose fragment carries the compressed source, never a `.gx`, so the program itself never reaches a server. Each deploy fetches the module from a pinned Gero release.

## How it's checked

- `zig build verify` must pass before a push: the unit tests, the format check, the project's own linter (explicit error sets, a reason above every `@as`, `@ptrCast`, `@alignCast` and `@bitCast`, a doc comment on every public declaration, a test file for the files under `src/`), the example gates, and a golden corpus that fails any change to the examples' bytecode that hasn't been approved again.
- Every assembly and Gero block in the specs of both languages and in the two teaching books is assembled or parsed, unless it is marked a fragment, and each diagnostic code is checked against its documentation and the code that emits it.
- CI runs the tests on Linux (all four release modes on `main`), macOS and Windows and under wasmtime, and on each system builds and runs every example, diffs its output, round-trips the assembly ones through the disassembler and runs each again through the wasm module.
- `zig build ci`, the local gate before a release, adds a benchmark gate that holds exact cycle counts against committed baselines, and a feature or fix needs a changeset.
- Gero Lab's tests drive the real `gero.wasm`, never a mock, built from Gero's source in its CI.
