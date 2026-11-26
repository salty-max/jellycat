// The Gero release the Lab runs: a pin, not a range. `scripts/gero-assets.mjs` reads this file, downloads the two assets
// of the release into `.cache/gero/`, refuses them unless their SHA-256 matches, and copies them into `public/gero/` under the
// names below. The version in each name makes the file immutable, so `vercel.json` caches `/gero/*` for a year: a pin that changes a file's bytes
// (a release asset replaced under the same tag) must change its version in the name too, or visitors keep the old file.
//
// Moving to a new gero release is one edit here (the tag, the version, the file names and the two hashes, which `shasum -a 256`
// gives for the release's `gero.wasm` and `samples.json`) and a look at what the Lab shows. Plain syntax only: Node runs this
// file as it is (type stripping), and the browser bundle imports it too.

/** gero's release tag, and the version its module reports for itself (`gero_version`). */
export const GERO_TAG = "v0.5.5";
export const GERO_VERSION = "0.5.5";

/** What each asset is called on the release, what it is called here, and the hash the build holds it to. */
export const GERO_ASSETS = {
  wasm: {
    release: "gero.wasm",
    file: `gero-${GERO_VERSION}.wasm`,
    sha256: "284443e8d751866bac5b12d3e0c8ac626821f8ee4bccf7b85e29b0d1653e4c06",
  },
  samples: {
    release: "samples.json",
    file: `samples-${GERO_VERSION}.json`,
    sha256: "2344c24f1ccf394c7a26feee6180ad33810105529fa5ff60fc09d1fa9f6abe7f",
  },
} as const;

/** Where the script downloads an asset from. */
export const releaseUrl = (release: string): string => `https://github.com/salty-max/gero/releases/download/${GERO_TAG}/${release}`;

/** Where the client fetches them from: the site's own origin. */
export const GERO_WASM_URL = `/gero/${GERO_ASSETS.wasm.file}`;
export const GERO_SAMPLES_URL = `/gero/${GERO_ASSETS.samples.file}`;
