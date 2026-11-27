// Export the approved identity and browser icons from the same paths the live site uses.
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import satori from "satori";
import { BRAND_MARK, brandSvg } from "../app/brand/art.ts";
import { STUDIO_NAME } from "../app/core/studio.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const kit = join(root, "branding");
const web = join(root, "public");
const css = await readFile(join(root, "app/app.css"), "utf8");
const themes = {};
for (const name of ["green", "amber", "white"]) {
  const block = new RegExp('data-phosphor="' + name + '"\\]\\s*\\{([^}]+)\\}').exec(css)?.[1];
  const value = (key) => new RegExp("--phosphor-" + key + ":\\s*(#[0-9a-f]+)", "i").exec(block ?? "")?.[1];
  if (!value("fg") || !value("bg")) throw new Error("Missing phosphor " + name);
  themes[name] = { ink: value("fg"), paper: value("bg") };
}
const variants = { black: { ink: "#000000", paper: "#ffffff" }, white: { ink: "#ffffff", paper: "#000000" }, green: themes.green, amber: themes.amber, "phosphor-white": themes.white };
const fontFile = join(root, "node_modules/@fontsource/vt323/files/vt323-latin-400-normal.woff");
const font = await readFile(fontFile);
const fonts = [{ name: "VT323", data: font, weight: 400, style: "normal" }];
async function save(file, content) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, content); }
const el = (type, style, children, props = {}) => ({ type, props: { style, children, ...props } });
const uri = (svg) => "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
async function lockup(ink, stacked) {
  const width = stacked ? 640 : 1200, height = stacked ? 460 : 300;
  const mark = brandSvg({ ink, width: stacked ? 300 : 224, height: stacked ? 224 : 224 });
  const image = el("img", { width: stacked ? 300 : 224, height: stacked ? 224 : 224 }, undefined, { src: uri(mark) });
  const text = el("div", { fontFamily: "VT323", fontSize: stacked ? 72 : 128, lineHeight: 1, whiteSpace: "pre", color: ink }, STUDIO_NAME);
  const rendered = await satori(el("div", { display: "flex", flexDirection: stacked ? "column" : "row", alignItems: "center", justifyContent: "center", gap: stacked ? 22 : 42, width, height, padding: 32, boxSizing: "border-box" }, [image, text]), { width, height, fonts });
  // Keep printer masters entirely vector, with the cat's paths inline rather than an embedded SVG image.
  let images = 0;
  const flattened = rendered.replace(/<image\b([^>]*?)\/>/g, (_match, attrs) => {
    const value = (key) => new RegExp('(?:^|\\s)' + key + '="([^"]+)"').exec(attrs)?.[1];
    images++;
    return `<svg x="${value("x")}" y="${value("y")}" width="${value("width")}" height="${value("height")}" viewBox="${BRAND_MARK.viewBox}"><path fill="${ink}" fill-rule="evenodd" d="${BRAND_MARK.foreground}"/></svg>`;
  });
  if (images !== 1) throw new Error("Expected one mark in the lockup.");
  return flattened;
}

const exported = [];
for (const [name, { ink }] of Object.entries(variants)) {
  const svgs = {
    mark: brandSvg({ ink, width: 1150, height: 860 }),
    horizontal: await lockup(ink, false),
    stacked: await lockup(ink, true),
  };
  for (const [shape, svg] of Object.entries(svgs)) {
    await save(join(kit, "svg", shape + "-" + name + ".svg"), svg);
    for (const width of [512, 2400]) await save(join(kit, "png", shape + "-" + name + "-" + width + ".png"), await sharp(Buffer.from(svg)).resize({ width }).withMetadata({ density: 300 }).png().toBuffer());
    exported.push({ shape, color: name, svg: "svg/" + shape + "-" + name + ".svg" });
  }
}
await mkdir(join(kit, "fonts"), { recursive: true });
await copyFile(fontFile, join(kit, "fonts/vt323-latin.woff"));
await copyFile(join(root, "node_modules/@fontsource/vt323/LICENSE"), join(kit, "fonts/OFL.txt"));

// A dark plate keeps the neon mark legible in both light and dark browser chrome.
function tileSvg(ink, paper, content = 54) {
  const offset = (64 - content) / 2;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="' + paper + '"/><svg x="' + offset + '" y="' + offset + '" width="' + content + '" height="' + content + '" viewBox="' + BRAND_MARK.viewBox + '"><path fill="' + ink + '" fill-rule="evenodd" d="' + BRAND_MARK.foreground + '"/></svg></svg>';
}
for (const [name, { ink, paper }] of Object.entries(themes)) {
  const svg = tileSvg(ink, paper);
  await save(join(kit, "icons/favicon-" + name + ".svg"), svg);
  await save(join(web, "brand/favicons/" + name + ".svg"), svg);
  await save(join(kit, "icons/avatar-" + name + "-512.png"), await sharp(Buffer.from(svg)).resize(512, 512).png().toBuffer());
}
const favicon = tileSvg(themes.green.ink, themes.green.paper);
await save(join(web, "favicon.svg"), favicon);
await save(join(web, "brand/favicon.svg"), favicon);
for (const size of [16, 32, 48]) {
  const png = await sharp(Buffer.from(favicon)).resize(size, size).png().toBuffer();
  await save(join(kit, "icons/favicon-" + size + ".png"), png);
  await save(join(web, "brand/favicon-" + size + ".png"), png);
}
for (const [name, size, content] of [["apple-touch-icon", 180, 54], ["icon-192", 192, 54], ["icon-512", 512, 54], ["maskable-512", 512, 40]]) {
  const png = await sharp(Buffer.from(tileSvg(themes.green.ink, themes.green.paper, content))).resize(size, size).png().toBuffer();
  await save(join(kit, "icons", name + ".png"), png);
  await save(join(web, name === "apple-touch-icon" ? name + ".png" : "brand/" + name + ".png"), png);
}

// 32-bit DIB frames, rather than a PNG-only ICO, also cover legacy icon consumers.
const frames = [];
for (const size of [16, 32, 48]) {
  const pixels = await sharp(Buffer.from(favicon)).resize(size, size).ensureAlpha().raw().toBuffer();
  const maskRow = Math.ceil(size / 32) * 4, bytes = size * size * 4;
  const dib = Buffer.alloc(40 + bytes + maskRow * size);
  dib.writeUInt32LE(40, 0); dib.writeInt32LE(size, 4); dib.writeInt32LE(size * 2, 8);
  dib.writeUInt16LE(1, 12); dib.writeUInt16LE(32, 14); dib.writeUInt32LE(bytes, 20);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const src = (y * size + x) * 4, dst = 40 + ((size - y - 1) * size + x) * 4;
    dib[dst] = pixels[src + 2]; dib[dst + 1] = pixels[src + 1]; dib[dst + 2] = pixels[src]; dib[dst + 3] = pixels[src + 3];
    if (!pixels[src + 3]) dib[40 + bytes + (size - y - 1) * maskRow + (x >> 3)] |= 128 >> (x & 7);
  }
  frames.push({ size, dib });
}
const ico = Buffer.alloc(6 + frames.length * 16 + frames.reduce((n, f) => n + f.dib.length, 0));
ico.writeUInt16LE(1, 2); ico.writeUInt16LE(frames.length, 4); let offset = 6 + frames.length * 16;
frames.forEach(({ size, dib }, i) => {
  const at = 6 + i * 16; ico[at] = size; ico[at + 1] = size;
  ico.writeUInt16LE(1, at + 4); ico.writeUInt16LE(32, at + 6); ico.writeUInt32LE(dib.length, at + 8); ico.writeUInt32LE(offset, at + 12);
  dib.copy(ico, offset); offset += dib.length;
});
await save(join(web, "favicon.ico"), ico); await save(join(kit, "icons/favicon.ico"), ico);
await save(join(web, "site.webmanifest"), JSON.stringify({ id: "/", name: STUDIO_NAME, short_name: "Jellycat", start_url: "/", display: "browser", background_color: themes.green.paper, theme_color: themes.green.paper, icons: [{ src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] }, null, 2) + "\n");
await save(join(kit, "palette.json"), JSON.stringify({ ...variants, description: "Phosphor colours come from app/app.css; black and white are the single-ink print masters." }, null, 2) + "\n");
await save(join(kit, "catalog.json"), JSON.stringify({ approved: BRAND_MARK.approved, typeface: "VT323", assets: exported, pngWidths: [512, 2400], source: "source/mark.json" }, null, 2) + "\n");
console.log("Exported 15 vector lockups, 30 transparent PNGs, five colour variants, typeface, avatars and browser icons.");

// A portable local guide: no network fonts, scripts or external image dependencies.
const palette = Object.entries(variants).map(([name, v]) => `<div class="swatch"><span style="background:${v.ink};border-color:${v.ink === "#ffffff" ? "#ccc" : v.ink}"></span><strong>${name}</strong><code>${v.ink}</code></div>`).join("");
const guide = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jellycat Studio — brand assets</title><style>@font-face{font-family:VT323;src:url(fonts/vt323-latin.woff)}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font:16px/1.55 Arial,sans-serif}main{max-width:1120px;margin:auto;padding:48px 24px}h1,h2{font-family:VT323;font-weight:400;line-height:1.1}h1{font-size:56px;margin:0 0 12px}h2{font-size:36px;margin:44px 0 16px}p{max-width:800px}.pair,.logos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.panel{padding:32px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;min-height:230px}.panel img{width:100%;max-height:260px;object-fit:contain}.dark{background:#031208;border-color:#031208}.mark{max-width:340px}.logos .panel{min-height:190px}.palette{display:flex;flex-wrap:wrap;gap:28px}.swatch{display:grid;gap:6px;min-width:140px}.swatch span{width:100%;height:64px;border:1px solid}.swatch code{font-size:14px}.icons{display:flex;gap:28px;align-items:center}.icons img{image-rendering:pixelated}a{color:#175a2b}table{border-collapse:collapse;width:100%;max-width:900px}td,th{text-align:left;border-bottom:1px solid #ddd;padding:12px}code{font-family:monospace;font-size:14px}@media(max-width:650px){.pair,.logos{grid-template-columns:1fr}h1{font-size:44px}main{padding:28px 16px}}@media print{main{padding:0}h2{break-after:avoid}.panel,.swatch{break-inside:avoid}.pair,.logos{gap:12px}a{color:inherit}}</style><main><h1>Jellycat Studio</h1><p>Approved pixel-cat identity. Centred stepped-circle pupils, square reflections, one colour. The same vector geometry is used by the site, favicons and print masters.</p><div class="pair"><div class="panel"><img class="mark" src="svg/mark-black.svg" alt="Black mark on white"></div><div class="panel dark"><img class="mark" src="svg/mark-green.svg" alt="Green mark on the tube background"></div></div><h2>Companion lockups</h2><p>The studio name uses the site's existing VT323 typeface. Lettering is outlined in the exported SVGs; no font installation is needed to use them.</p><div class="logos"><div class="panel"><img src="svg/horizontal-black.svg" alt="Horizontal Jellycat Studio lockup"></div><div class="panel"><img src="svg/stacked-black.svg" alt="Stacked Jellycat Studio lockup"></div></div><h2>Palette</h2><div class="palette">${palette}</div><h2>Browser artwork</h2><div class="icons"><img src="icons/favicon-16.png" width="16" height="16" alt="16 pixel favicon"><img src="icons/favicon-32.png" width="32" height="32" alt="32 pixel favicon"><img src="icons/favicon-48.png" width="48" height="48" alt="48 pixel favicon"><img src="icons/apple-touch-icon.png" width="90" height="90" alt="Apple touch icon"><img src="icons/maskable-512.png" width="100" height="100" alt="Maskable icon"></div><h2>Choose a file</h2><table><thead><tr><th>Use</th><th>Files</th></tr></thead><tbody><tr><td>Invoices, business cards and other print layouts</td><td><a href="svg/mark-black.svg">Black mark SVG</a>; <a href="svg/horizontal-black.svg">horizontal SVG</a>; <a href="svg/stacked-black.svg">stacked SVG</a></td></tr><tr><td>Reverse artwork</td><td>Corresponding <code>-white.svg</code> files</td></tr><tr><td>Screen use</td><td>Green, amber and phosphor-white SVGs</td></tr><tr><td>Software that needs raster images</td><td><code>png/</code>: transparent 512px and 2400px exports</td></tr><tr><td>Browser and home-screen icons</td><td><code>icons/</code></td></tr></tbody></table><h2>Keep it consistent</h2><p>Preserve the aspect ratio and the complete face. Keep clear space of about one pupil diameter around the mark in print and marketing layouts. Use a single ink and keep CRT glow and scanlines separate from the artwork.</p><p>SVG is preferred for print. Check a physical proof at the intended size before commercial printing. The provided PNGs carry 300ppi metadata.</p><p><a href="README.md">Asset notes</a> · <a href="catalog.json">Export catalog</a> · <a href="fonts/OFL.txt">Typeface license</a></p></main></html>`;
await save(join(kit, "index.html"), guide);

const sheet = [];
for (const [column, [name, v]] of Object.entries(variants).entries()) {
  for (const [row, shape] of ["mark", "horizontal", "stacked"].entries()) {
    const thumb = await sharp(join(kit, "svg", shape + "-" + name + ".svg")).resize(220, 140, { fit: "contain", background: v.paper }).png().toBuffer();
    const label = Buffer.from('<svg width="260" height="36"><rect width="260" height="36" fill="' + v.paper + '"/><text x="18" y="24" font-family="Arial" font-size="14" fill="' + v.ink + '">' + shape + " / " + name + '</text></svg>');
    sheet.push({ input: await sharp({ create: { width: 260, height: 190, channels: 3, background: v.paper } }).composite([{ input: label, left: 0, top: 0 }, { input: thumb, left: 20, top: 40 }]).png().toBuffer(), left: column * 260, top: row * 190 });
  }
}
await save(join(kit, "preview.png"), await sharp({ create: { width: 1300, height: 570, channels: 3, background: "#fff" } }).composite(sheet).png().toBuffer());
