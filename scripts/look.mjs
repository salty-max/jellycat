// Puts a mockup's frame and a Storybook story side by side, at the same size and 1:1, with 4x crops, in .cache/look/.
//   node scripts/look.mjs [--mockup phosphor-desktop.html] [--selector "#jd"] [--story os-boot-screen--default]
//                         [--phosphor green] [--size 652x480] [--crop 0,0,160,120] [--name boot]
// It starts its own mockups server and Storybook on free ports, and stops them after.
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { parseArgs } from "node:util";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const { values } = parseArgs({
  options: Object.fromEntries(["mockup", "selector", "story", "phosphor", "size", "crop", "name"].map((key) => [key, { type: "string" }])),
});
const mockup = values.mockup ?? "phosphor-desktop.html";
const selector = values.selector ?? "#jd";
const story = values.story ?? "os-boot-screen--default";
const phosphor = values.phosphor ?? "green";
const name = values.name ?? story;
const [width, height] = (values.size ?? "652x480").split("x").map(Number);
const [cx, cy, cw, ch] = (values.crop ?? "0,0,160,120").split(",").map(Number);
const SCALE = 4;
const outDir = ".cache/look";

const up = (url) => fetch(url).then((r) => r.ok, () => false);
const freePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer().listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    }).on("error", reject);
  });

// Its own servers on free ports, never one that happens to answer on 6006 or 4795: in another worktree that is another branch's code.
const started = [];
async function start(command, args, url) {
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  const failed = new Promise((_, reject) => child.on("error", (error) => reject(new Error(`${command}: ${error.message}`))));
  if (child.pid) started.push(child);
  const ready = (async () => {
    for (let i = 0; i < 120; i++) {
      if (await up(url)) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`${url} did not come up`);
  })();
  await Promise.race([ready, failed]);
}

const crop = async (png) => sharp(png).extract({ left: cx, top: cy, width: cw, height: ch }).resize(cw * SCALE, ch * SCALE, { kernel: "nearest" }).png().toBuffer();

try {
  const [mockupsPort, storybookPort] = [await freePort(), await freePort()];
  await start("python3", ["-m", "http.server", String(mockupsPort), "--bind", "127.0.0.1", "--directory", "mockups"], `http://127.0.0.1:${mockupsPort}/`);
  await start("pnpm", ["exec", "storybook", "dev", "-p", String(storybookPort), "--no-open", "--ci"], `http://localhost:${storybookPort}/`);

  // The system Chrome, as the tests use, and a device scale of 1 so a pixel is a pixel.
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });

  await page.goto(`http://127.0.0.1:${mockupsPort}/${mockup}`);
  await page.evaluate(() => document.fonts.ready);
  const frame = page.locator(selector);
  // The mockup's frame is wider than the story's viewport on purpose: it is cut to the size asked for.
  await page.setViewportSize({ width: Math.max(width, 1000), height: Math.max(height, 900) });
  const mockupPng = await frame.screenshot();
  const mockupMeta = await sharp(mockupPng).metadata();

  await page.setViewportSize({ width, height });
  await page.goto(`http://localhost:${storybookPort}/iframe.html?id=${story}&viewMode=story&globals=phosphor:${phosphor}`);
  await page.waitForSelector("#storybook-root > *");
  // Storybook's padded layout would inset the story by 16px; the mockup's frame has no inset.
  await page.addStyleTag({ content: ".sb-main-padded { padding: 0 !important; }" });
  await page.evaluate(() => document.fonts.ready);
  const storyPng = await page.screenshot();
  await browser.close();

  mkdirSync(outDir, { recursive: true });
  // No scaling: a picture larger than the size asked for is cut from its top left corner.
  const fit = async (png) => {
    const { width: w, height: h } = await sharp(png).metadata();
    return sharp(png).extract({ left: 0, top: 0, width: Math.min(w, width), height: Math.min(h, height) }).png().toBuffer();
  };
  const [a, b] = [await fit(mockupPng), await fit(storyPng)];
  const [ca, cb] = [await crop(a), await crop(b)];
  const sideBySide = (left, right, w, h, file) =>
    sharp({ create: { width: w * 2 + 8, height: h, channels: 4, background: "#808080" } })
      .composite([{ input: left, left: 0, top: 0 }, { input: right, left: w + 8, top: 0 }])
      .png()
      .toFile(file);
  await sideBySide(a, b, width, height, `${outDir}/${name}.png`);
  await sideBySide(ca, cb, cw * SCALE, ch * SCALE, `${outDir}/${name}-crop.png`);
  console.log(`mockup frame ${mockupMeta.width}x${mockupMeta.height}, story ${width}x${height}`);
  console.log(`${outDir}/${name}.png (left: mockup, right: story)`);
  console.log(`${outDir}/${name}-crop.png (4x of ${cx},${cy} ${cw}x${ch})`);
} finally {
  for (const child of started) try { process.kill(-child.pid) } catch {}
}
