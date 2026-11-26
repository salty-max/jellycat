// @vitest-environment node
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GERO_ASSETS, releaseUrl } from "../app/lab/gero";
import { ensureGeroAssets, type GeroAsset } from "./gero-assets.mjs";

const sha256 = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const body = (bytes: Uint8Array | string) => ({ ok: true, status: 200, arrayBuffer: async () => new Uint8Array(Buffer.from(bytes)).buffer });
const refusal = (status: number) => ({ ok: false, status, arrayBuffer: async () => new ArrayBuffer(0) });

// Two small made-up assets, so most tests don't move a megabyte: `wasm` and `samples` as the pin names them.
const WASM = "pretend module";
const SAMPLES = '{"version":1,"samples":[]}';
const assets: GeroAsset[] = [
  { release: "gero.wasm", file: "gero-9.9.9.wasm", sha256: sha256(WASM) },
  { release: "samples.json", file: "samples-9.9.9.json", sha256: sha256(SAMPLES) },
];
const url = (asset: GeroAsset) => `https://example.test/${asset.release}`;
const serve = (files: Record<string, Uint8Array | string>) => vi.fn(async (from: string) => body(files[from.slice("https://example.test/".length)] ?? ""));

let cache: string;
let out: string;
beforeEach(async () => {
  const root = await mkdtemp(join(tmpdir(), "gero-assets-"));
  cache = join(root, "cache");
  out = join(root, "public", "gero");
});
afterEach(() => rm(join(cache, ".."), { recursive: true, force: true }));

const run = (fetcher: ReturnType<typeof serve>, more: object = {}) => ensureGeroAssets({ assets, url, cache, out, fetcher, sleep: async () => {}, ...more });
const names = (dir: string) => readdir(dir).then((list) => list.toSorted());

describe("ensureGeroAssets", () => {
  test("downloads each asset once and puts it in the cache and in public", async () => {
    const fetcher = serve({ "gero.wasm": WASM, "samples.json": SAMPLES });
    expect(await run(fetcher)).toEqual([
      { file: "gero-9.9.9.wasm", how: "fetched" },
      { file: "samples-9.9.9.json", how: "fetched" },
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map(([from]) => from)).toEqual(["https://example.test/gero.wasm", "https://example.test/samples.json"]);
    for (const dir of [cache, out]) expect(await names(dir)).toEqual(["gero-9.9.9.wasm", "samples-9.9.9.json"]);
    expect(await readFile(join(out, "gero-9.9.9.wasm"), "utf8")).toBe(WASM);
  });

  test("doesn't fetch what the cache holds, and still fills public", async () => {
    await run(serve({ "gero.wasm": WASM, "samples.json": SAMPLES }));
    await rm(out, { recursive: true });
    const fetcher = serve({});
    expect((await run(fetcher)).map(({ how }) => how)).toEqual(["cached", "cached"]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readFile(join(out, "samples-9.9.9.json"), "utf8")).toBe(SAMPLES);
  });

  test("fetches again a cached file that no longer matches, and replaces it", async () => {
    await run(serve({ "gero.wasm": WASM, "samples.json": SAMPLES }));
    await writeFile(join(cache, "gero-9.9.9.wasm"), "tampered");
    const fetcher = serve({ "gero.wasm": WASM });
    expect((await run(fetcher)).map(({ how }) => how)).toEqual(["fetched", "cached"]);
    expect(await readFile(join(out, "gero-9.9.9.wasm"), "utf8")).toBe(WASM);
  });

  test("fails on a download that doesn't match, naming the URL and both hashes, and keeps nothing of it", async () => {
    const fetcher = serve({ "gero.wasm": "a different module", "samples.json": SAMPLES });
    const failure = await run(fetcher).catch((error: Error) => error);
    expect(failure).toBeInstanceOf(Error);
    const message = (failure as Error).message;
    expect(message).toContain("https://example.test/gero.wasm");
    expect(message).toContain(sha256("a different module"));
    expect(message).toContain(assets[0]!.sha256);
    expect(await names(cache)).toEqual([]);
    expect(await names(out)).toEqual([]);
  });

  test("removes the files of an older pin, from the cache and from public", async () => {
    for (const dir of [cache, out]) {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "gero-0.5.4.wasm"), "old");
      await writeFile(join(dir, "samples-0.5.4.json"), "old");
    }
    await run(serve({ "gero.wasm": WASM, "samples.json": SAMPLES }));
    for (const dir of [cache, out]) expect(await names(dir)).toEqual(["gero-9.9.9.wasm", "samples-9.9.9.json"]);
  });

  test("tries again after a server error or a dropped connection, up to three times", async () => {
    const answers = [async () => refusal(503), async () => Promise.reject(new TypeError("fetch failed")), async () => body(WASM)];
    const fetcher = vi.fn(async (from: string) => (from.endsWith("samples.json") ? body(SAMPLES) : answers.shift()!()));
    await run(fetcher as unknown as ReturnType<typeof serve>);
    expect(fetcher.mock.calls.filter(([from]) => from.endsWith("gero.wasm"))).toHaveLength(3);
  });

  test("gives up after three failed tries, naming the URL", async () => {
    const fetcher = vi.fn(async () => refusal(502));
    await expect(run(fetcher as unknown as ReturnType<typeof serve>)).rejects.toThrow("https://example.test/gero.wasm answered 502");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  test("doesn't try again when the asset isn't there", async () => {
    const fetcher = vi.fn(async () => refusal(404));
    await expect(run(fetcher as unknown as ReturnType<typeof serve>)).rejects.toThrow("answered 404");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("the real pin", () => {
  // Vitest's globalSetup has already fetched it: the files in the cache are the release's.
  const CACHE = join(import.meta.dirname, "..", ".cache", "gero");

  test("the release's URLs are the ones gero publishes", () => {
    expect(releaseUrl("gero.wasm")).toBe("https://github.com/salty-max/gero/releases/download/v0.5.5/gero.wasm");
  });

  test("a corrupted copy of the module is refused, loudly, and nothing of it is kept", async () => {
    const module = await readFile(join(CACHE, GERO_ASSETS.wasm.file));
    const corrupted = Buffer.from(module);
    corrupted[corrupted.length >> 1] ^= 0xff;
    const fetcher = vi.fn(async () => body(corrupted));
    const failure = await ensureGeroAssets({ assets: [GERO_ASSETS.wasm], cache, out, fetcher, sleep: async () => {} }).catch((error: Error) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain(releaseUrl("gero.wasm"));
    expect((failure as Error).message).toContain(sha256(corrupted));
    expect((failure as Error).message).toContain(GERO_ASSETS.wasm.sha256);
    expect(await names(cache)).toEqual([]);
    expect(await names(out)).toEqual([]);
  });

  test("an intact copy is accepted", async () => {
    const fetcher = vi.fn(async () => body(await readFile(join(CACHE, GERO_ASSETS.wasm.file))));
    expect(await ensureGeroAssets({ assets: [GERO_ASSETS.wasm], cache, out, fetcher, sleep: async () => {} })).toEqual([{ file: GERO_ASSETS.wasm.file, how: "fetched" }]);
  });

  test("the files in the cache are the pinned ones", async () => {
    for (const asset of Object.values(GERO_ASSETS)) expect(sha256(await readFile(join(CACHE, asset.file))), asset.file).toBe(asset.sha256);
  });
});
