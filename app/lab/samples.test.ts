// @vitest-environment node
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, expect, test, vi } from "vitest";
import expected from "./expected.json";
import { GERO_ASSETS, GERO_SAMPLES_URL, GERO_WASM_URL } from "./gero";
import { createSamplesLoader, DEFAULT_PROGRAM, SamplesError } from "./samples";

const CACHE = join(import.meta.dirname, "..", "..", ".cache", "gero");
let manifest: unknown;
beforeAll(async () => {
  manifest = JSON.parse(await readFile(join(CACHE, GERO_ASSETS.samples.file), "utf8"));
});

const answer = (body: unknown, status = 200) => vi.fn(async () => ({ ok: status < 400, status, json: async () => body }) as Response);

test("the client fetches the site's own copies, named by the version", () => {
  expect(GERO_WASM_URL).toBe("/gero/gero-0.5.5.wasm");
  expect(GERO_SAMPLES_URL).toBe("/gero/samples-0.5.5.json");
});

test("flattens the manifest: twelve programs, a multi-file one with its entry among its files", async () => {
  const programs = await createSamplesLoader("/s.json", answer(manifest))();
  expect(programs).toHaveLength(12);
  expect(programs.map((p) => p.name).toSorted()).toEqual(Object.keys(expected).toSorted());
  expect(programs.filter((p) => p.lang === "gr")).toHaveLength(7);
  expect(programs.filter((p) => p.lang === "gas")).toHaveLength(5);
  const banks = programs.find((p) => p.name === "banks")!;
  expect(banks.files.length).toBeGreaterThan(1);
  expect(banks.files.map((f) => f.name)).toContain(banks.entry);
  expect(programs.map((p) => p.name)).toContain(DEFAULT_PROGRAM);
});

test("fetches once, however often it is asked", async () => {
  const fetcher = answer(manifest);
  const load = createSamplesLoader("/s.json", fetcher);
  await Promise.all([load(), load()]);
  await load();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith("/s.json");
});

test("a failed fetch is forgotten: the next try fetches again", async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValue({ ok: true, status: 200, json: async () => manifest });
  const load = createSamplesLoader("/s.json", fetcher as unknown as typeof fetch);
  await expect(load()).rejects.toThrow(SamplesError);
  await expect(load()).rejects.toThrow("503");
  expect(await load()).toHaveLength(12);
  expect(fetcher).toHaveBeenCalledTimes(3);
});

test("a manifest of another version is named, not parsed on hope", async () => {
  await expect(createSamplesLoader("/s.json", answer({ version: 2, samples: [] }))()).rejects.toThrow("version 2");
});
