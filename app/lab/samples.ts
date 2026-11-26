// The programs the Lab runs: gero's `samples.json`, the twelve of gero's own examples, fetched from the site's own copy (the pinned
// release, scripts/gero-assets.mjs). One fetch a page load, shared by the window and the Terminal; a failed fetch is forgotten, so
// the next try fetches again.
import { GERO_SAMPLES_URL } from "./gero";
import type { Program } from "./run";

/** The program the window opens on. */
export const DEFAULT_PROGRAM = "fizzbuzz";

/** The manifest's version this build reads: a manifest that says another is named, not parsed on hope. */
const MANIFEST_VERSION = 1;

/** The programs could not be fetched or are not a manifest this build reads. */
export class SamplesError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SamplesError";
  }
}

interface Manifest {
  version?: number;
  samples?: { name: string; lang: string; entry: string; files: Record<string, string> }[];
}

function decode(body: unknown): Program[] {
  const manifest = (body ?? {}) as Manifest;
  if (manifest.version !== MANIFEST_VERSION) throw new SamplesError(`the programs are version ${String(manifest.version)}, this build reads ${MANIFEST_VERSION}`);
  return (manifest.samples ?? []).map((sample) => ({
    name: sample.name,
    lang: sample.lang === "gr" ? "gr" : "gas",
    entry: sample.entry,
    files: Object.entries(sample.files).map(([name, text]) => ({ name, text })),
  }));
}

/** A loader that fetches `url` once and keeps what it got, and forgets a failure. */
export function createSamplesLoader(url: string, fetcher: typeof fetch = (...args) => fetch(...args)): () => Promise<Program[]> {
  let pending: Promise<Program[]> | null = null;
  return () => {
    pending ??= (async () => {
      let response: Response;
      try {
        response = await fetcher(url);
      } catch (error) {
        throw new SamplesError(`could not fetch ${url}`, { cause: error });
      }
      if (!response.ok) throw new SamplesError(`could not fetch ${url}: ${response.status}`);
      return decode(await response.json());
    })().catch((error: unknown) => {
      pending = null;
      throw error;
    });
    return pending;
  };
}

/** Every program, fetched the first time it is asked for. */
export const loadSamples = createSamplesLoader(GERO_SAMPLES_URL);
