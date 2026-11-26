// The types of gero-assets.mjs, for the tests that import it.
export interface GeroAsset {
  readonly release: string;
  readonly file: string;
  readonly sha256: string;
}

export interface GeroAssetsOptions {
  assets?: readonly GeroAsset[];
  url?: (asset: GeroAsset) => string;
  cache?: string;
  out?: string;
  fetcher?: (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>;
  sleep?: (ms: number) => Promise<void>;
}

export function ensureGeroAssets(options?: GeroAssetsOptions): Promise<{ file: string; how: "cached" | "fetched" }[]>;
export function setup(): Promise<void>;
