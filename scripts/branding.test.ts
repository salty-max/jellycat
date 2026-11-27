// @vitest-environment node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { expect, test } from "vitest";
import { BRAND_MARK } from "../app/brand/art";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root));

test("all vector masters carry the approved mark and contain no embedded images", async () => {
  for (const shape of ["mark", "horizontal", "stacked"]) {
    for (const color of ["black", "white", "green", "amber", "phosphor-white"]) {
      const path = `branding/svg/${shape}-${color}.svg`;
      const svg = (await read(path)).toString();
      expect(svg, path).toContain(BRAND_MARK.foreground);
      expect(svg, path).not.toMatch(/<image\b|data:image/);
      const meta = await sharp(await read(path)).metadata();
      expect(meta.format, path).toBe("svg");
      for (const width of [512, 2400]) {
        const png = await sharp(fileURLToPath(new URL(`branding/png/${shape}-${color}-${width}.png`, root))).metadata();
        expect(png.width).toBe(width);
        expect(png.hasAlpha).toBe(true);
        expect(png.density).toBe(300);
      }
    }
  }
});

test("the favicon and every phosphor SVG use the same approved paths", async () => {
  for (const file of ["public/favicon.svg", "public/brand/favicon.svg", ...["green", "amber", "white"].map((name) => `public/brand/favicons/${name}.svg`)]) {
    expect((await read(file)).toString(), file).toContain(BRAND_MARK.foreground);
  }
  const ico = await read("public/favicon.ico");
  expect(ico.readUInt16LE(0)).toBe(0);
  expect(ico.readUInt16LE(2)).toBe(1);
  expect(ico.readUInt16LE(4)).toBe(3);
  for (const [i, size] of [16, 32, 48].entries()) {
    const entry = 6 + i * 16;
    expect(ico[entry]).toBe(size);
    expect(ico[entry + 1]).toBe(size);
    const offset = ico.readUInt32LE(entry + 12);
    expect(ico.readUInt32LE(offset)).toBe(40);
    expect(ico.readInt32LE(offset + 4)).toBe(size);
    expect(ico.readInt32LE(offset + 8)).toBe(size * 2);
    expect(offset + ico.readUInt32LE(entry + 8)).toBeLessThanOrEqual(ico.length);
  }
});

test("bookmark artwork exists at its declared sizes and the maskable mark fits the safe circle", async () => {
  const manifest = JSON.parse((await read("public/site.webmanifest")).toString()) as { display: string; icons: { src: string; sizes: string }[] };
  expect(manifest.display).toBe("browser");
  for (const icon of manifest.icons) {
    const meta = await sharp(await read(`public${icon.src}`)).metadata();
    expect(`${meta.width}x${meta.height}`).toBe(icon.sizes);
  }
  const apple = await sharp(await read("public/apple-touch-icon.png")).metadata();
  expect([apple.width, apple.height]).toEqual([180, 180]);
  const { data, info } = await sharp(await read("public/brand/maskable-512.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let marked = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const p = (y * info.width + x) * 4;
    expect(data[p + 3]).toBe(255);
    if (data[p + 1] > 100 && data[p + 1] > data[p] * 2) {
      marked++;
      expect(Math.hypot(x + 0.5 - 256, y + 0.5 - 256)).toBeLessThanOrEqual(204.8);
    }
  }
  expect(marked).toBeGreaterThan(1000);
});
