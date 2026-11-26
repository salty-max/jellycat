// The Gero module and its programs, fetched at build from the pinned release (app/lab/gero.ts) and never kept in git.
//
//   node scripts/gero-assets.mjs
//
// Each asset is downloaded once into .cache/gero/, held to the pinned SHA-256, and copied into public/gero/ (gitignored), where
// the build serves it and the Lab fetches it. A file in the cache is hashed again on every run and fetched again only when it no
// longer matches. A release asset can be replaced after the pin was written, so a download that doesn't match is an error that
// names the URL and both hashes, and nothing is kept: the build stops rather than ship a different module. Files of an older pin
// are removed from both folders.
//
// pnpm runs no `pre` scripts, so `build`, `check` and `dev` call this first, Vitest's globalSetup is this file (`setup`), and
// ci.yml runs it before the check job's steps.
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { GERO_ASSETS, GERO_TAG, releaseUrl } from "../app/lab/gero.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ATTEMPTS = 3;
const TIMEOUT_MS = 60_000;

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readIfThere = (path) => readFile(path).catch((error) => (error?.code === "ENOENT" ? null : Promise.reject(error)));

// One download, retried when the network or GitHub fails (a 5xx, a dropped connection), not when GitHub answers that the asset is
// not there: a 404 means the pin is wrong.
async function download(url, fetcher, sleep) {
  let failure;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      failure = new Error(`${url} answered ${response.status}`);
      if (response.status < 500) throw failure;
    } catch (error) {
      if (error === failure) throw error;
      failure = new Error(`${url} could not be fetched: ${error?.message ?? error}`);
    }
    if (attempt < ATTEMPTS) await sleep(500 * attempt);
  }
  throw failure;
}

/**
 * Put the pinned assets in `out`, downloading what `cache` doesn't already hold. Returns what it did, per file.
 * Throws, naming the URL and the hashes, when a download doesn't match its pin.
 */
export async function ensureGeroAssets({
  assets = Object.values(GERO_ASSETS),
  url = (asset) => releaseUrl(asset.release),
  cache = join(ROOT, ".cache", "gero"),
  out = join(ROOT, "public", "gero"),
  fetcher = fetch,
  sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
} = {}) {
  await mkdir(cache, { recursive: true });
  await mkdir(out, { recursive: true });
  const done = [];

  for (const asset of assets) {
    const cached = join(cache, asset.file);
    let how = "cached";
    if (sha256((await readIfThere(cached)) ?? "") !== asset.sha256) {
      const from = url(asset);
      const bytes = await download(from, fetcher, sleep);
      const actual = sha256(bytes);
      if (actual !== asset.sha256) {
        await rm(cached, { force: true });
        throw new Error(`${from}: SHA-256 is ${actual}, the pin in app/lab/gero.ts says ${asset.sha256}. Nothing was kept.`);
      }
      // Written beside its name and renamed, so a run cut short never leaves a half file under the pinned name.
      await writeFile(`${cached}.part`, bytes);
      await rename(`${cached}.part`, cached);
      how = "fetched";
    }
    await copyFile(cached, join(out, asset.file));
    done.push({ file: asset.file, how });
  }

  // An older pin's files, and anything else that isn't pinned, in both folders.
  const keep = new Set(assets.map((asset) => asset.file));
  for (const folder of [cache, out]) {
    for (const name of await readdir(folder)) if (!keep.has(name)) await rm(join(folder, name), { recursive: true, force: true });
  }
  return done;
}

// Vitest's globalSetup calls this one.
export async function setup() {
  await ensureGeroAssets();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const done = await ensureGeroAssets();
    console.log(`gero ${GERO_TAG}: ${done.map(({ file, how }) => `${file} ${how}`).join(", ")}`);
  } catch (error) {
    console.error(`gero-assets: ${error.message}`);
    process.exit(1);
  }
}
