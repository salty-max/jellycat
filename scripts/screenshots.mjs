// Takes the projects' screenshots. It opens each web app's live site in the system Chrome, logged out, at a desktop and a phone
// size, and writes each picture as AVIF and WebP to public/screenshots/<slug>/<name>. `app/core/projects.ts` lists them with their
// alt text, width and height, and `app/core/screenshots.test.ts` holds the list and the files together. Run it after a change a
// visitor would see, look at every picture at 1:1, and commit what it writes. Nothing runs it in the build or the check.
//   node scripts/screenshots.mjs                    every capture below
//   node scripts/screenshots.mjs hundo,farseer      these projects only
//   node scripts/screenshots.mjs --from shot.png --slug yonder --name map-desktop --size desktop
//                                                   a picture taken by hand (in game, or a site this script can't open),
//                                                   scaled and written the same way
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { PROJECTS } from "../app/core/projects.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

// A desktop picture is 1440 px wide, the viewport at 1x. A phone picture is 780 px wide, the viewport at 2x, so it stays sharp when
// the shell's viewer shows it across a phone's screen. A picture taken by hand is scaled down to the same width, never up.
const SIZES = {
  desktop: { width: 1440, context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  phone: { width: 780, context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
};

// Hearthtale's home page has sample journal pages, written by the addon for test characters: pick one and scroll it under the header.
const hearthtaleSample = (character) => async (page) => {
  await page.getByRole("button", { name: new RegExp(`^${character}\\b`) }).click();
  await page.evaluate(() => {
    const top = document.querySelector("#samples").getBoundingClientRect().top + scrollY;
    scrollTo(0, top - document.querySelector("header").offsetHeight);
  });
};

// The time Gero Lab's clock is held at. Only for Gero Lab: Farseer's "8 hr. ago" needs the real time.
const GERO_TIME = new Date("2026-11-20T12:00:00+01:00");

// Gero Lab with its fizzbuzz sample (from gero's examples) compiled and loaded, then run a fixed number of steps. With the clock
// fixed (its log prints the time), two runs write the same files.
const geroLoaded = async (page) => {
  await page.getByRole("button", { name: "Load Program" }).first().click();
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "fizzbuzz", exact: true }).click();
  await page.getByRole("button", { name: "Assemble & Load" }).click();
  const step = page.getByRole("button", { name: "Step", exact: true });
  for (let i = 0; i < 40; i++) await step.click();
};

// What each web app shows a logged-out visitor, public pages only. Not here: Lucarne, whose Cloudflare challenge never lets an
// automated Chrome through; WoWLocker, which has no character to show until you log in; Ravenpost, whose site is the download page
// of a desktop app; the addons, whose pictures are taken in game and come through --from.
const CAPTURES = {
  // hundo.quest itself isn't deployed yet: the pictures are of two of its guides, Link's Awakening and Dark Souls Remastered, each
  // on its first chapter with a fresh save, so the later chapters are still hidden.
  hundo: [
    { name: "koholint-desktop", size: "desktop", url: "https://koholint.hundo.quest/guide/1" },
    { name: "lordran-desktop", size: "desktop", url: "https://lordran.hundo.quest/guide/1" },
    { name: "koholint-phone", size: "phone", url: "https://koholint.hundo.quest/guide/1" },
  ],
  farseer: [
    { name: "feed-desktop", size: "desktop", url: "https://farseer-mu.vercel.app/" },
    // One post by its id, so its alt text holds from one run to the next (`shows`: a deleted post would be the app's own not-found
    // screen, with a 200). The feeds show whatever is newest that day.
    { name: "post-desktop", size: "desktop", url: "https://farseer-mu.vercel.app/post/718", shows: "Macabre Rewards Await in Talebound" },
    { name: "feed-phone", size: "phone", url: "https://farseer-mu.vercel.app/" },
  ],
  hearthtale: [
    { name: "journal-desktop", size: "desktop", url: "https://hearthtale.app/", prepare: hearthtaleSample("Brannok") },
    { name: "epitaph-desktop", size: "desktop", url: "https://hearthtale.app/", prepare: hearthtaleSample("Pippa") },
    { name: "journal-phone", size: "phone", url: "https://hearthtale.app/", prepare: hearthtaleSample("Brannok") },
  ],
  // Gero Lab, Gero's playground in the browser, is laid out for a desktop only.
  gero: [
    {
      name: "editor-desktop",
      size: "desktop",
      url: "https://gero-lab.vercel.app/",
      fixedTime: GERO_TIME,
      // Unfocused, so the editor's blinking cursor isn't in the picture.
      prepare: async (page) => {
        await geroLoaded(page);
        await page.getByRole("button", { name: "Edit Program" }).click();
        await page.evaluate(() => document.activeElement?.blur());
      },
    },
    {
      name: "cockpit-desktop",
      size: "desktop",
      url: "https://gero-lab.vercel.app/",
      fixedTime: GERO_TIME,
      // Scrolled past the memory pane to the stack, the disassembly at the stopped instruction, the registers and the log: the Stack
      // heading where the Memory heading sits before any scroll, so no pane hides under the toolbar.
      prepare: async (page) => {
        await geroLoaded(page);
        const memory = await page.getByText("Memory", { exact: true }).first().boundingBox();
        if (!memory) throw new Error("gero: no Memory heading on screen, Gero Lab's layout has changed");
        const scrolled = await page.getByText("Stack", { exact: true }).first().evaluate((heading, top) => {
          let pane = heading.parentElement;
          while (pane && !(pane.scrollHeight > pane.clientHeight && /auto|scroll/.test(getComputedStyle(pane).overflowY))) pane = pane.parentElement;
          if (pane) pane.scrollTop += heading.getBoundingClientRect().top - top;
          return Boolean(pane);
        }, memory.y);
        if (!scrolled) throw new Error("gero: nothing scrolls above the Stack heading, Gero Lab's layout has changed");
      },
    },
  ],
};

const kb = (file) => `${Math.round(statSync(file).size / 1024)} KB`;

/** Writes `png` as `<name>.avif` and `<name>.webp` under the project's folder, scaled to its size's width; returns the size. */
async function write(png, slug, name, size) {
  const folder = join(root, "public/screenshots", slug);
  mkdirSync(folder, { recursive: true });
  const image = sharp(png).resize({ width: SIZES[size].width, withoutEnlargement: true });
  const avif = join(folder, `${name}.avif`);
  const webp = join(folder, `${name}.webp`);
  const { width, height } = await image.clone().avif({ quality: 65, effort: 6 }).toFile(avif);
  await image.clone().webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(webp);
  console.log(`/screenshots/${slug}/${name}: ${size}, ${width} x ${height}, AVIF ${kb(avif)}, WebP ${kb(webp)}`);
  return { src: `/screenshots/${slug}/${name}`, size, width, height };
}

// A page that isn't the app: an error, or a bot check standing in front of it. Better no picture than a picture of that.
async function refuse(page, response, url) {
  const title = await page.title();
  if (response?.headers()["cf-mitigated"] === "challenge" || /just a moment|un instant|attention required/i.test(title))
    throw new Error(`${url} shows a bot check ("${title}"): take the picture by hand and run it through --from`);
  if (!response?.ok()) throw new Error(`${url} answered ${response?.status() ?? "nothing"}`);
}

// The page once it stops moving: two screenshots in a row alike. The mouse goes to the corner, off whatever it last clicked or
// hovered. Reduced motion settles most of the rest, and CSS animations are held still for each shot (Gero Lab's footer has a heart
// that beats anyway); waiting covers what a script moves, like Gero Lab's disassembly scrolling to the stopped instruction.
async function still(page, label) {
  await page.mouse.move(0, 0);
  const shot = () => page.screenshot({ animations: "disabled" });
  let last = await shot();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(300);
    const next = await shot();
    if (next.equals(last)) return next;
    last = next;
  }
  console.log(`${label}: still moving after 3 s, taken as it is`);
  return last;
}

async function capture(browser, slug, { name, size, url, fixedTime, shows, prepare }) {
  const context = await browser.newContext({
    ...SIZES[size].context,
    colorScheme: "light",
    reducedMotion: "reduce",
    locale: "en-US",
    timezoneId: "Europe/Paris",
    serviceWorkers: "block",
  });
  try {
    if (fixedTime) await context.clock.setFixedTime(fixedTime);
    const page = await context.newPage();
    // Checked on load: a bot check's page never goes quiet on the network.
    const response = await page.goto(url, { waitUntil: "load" });
    await refuse(page, response, url);
    await page.waitForLoadState("networkidle");
    await prepare?.(page);
    await page.waitForLoadState("networkidle");
    if (shows && !(await page.getByText(shows).count())) throw new Error(`${url} doesn't show "${shows}" any more: pick another page and read its alt text`);
    // The fonts, and the images on screen decoded. A lazy image below the fold never loads, so its decode() would never settle.
    await page.evaluate(async () => {
      await document.fonts.ready;
      const onScreen = [...document.images].filter((image) => image.getBoundingClientRect().top < innerHeight);
      await Promise.all(onScreen.map((image) => Promise.race([image.decode().catch(() => {}), new Promise((done) => setTimeout(done, 5000))])));
    });
    return await write(await still(page, `${slug}/${name}`), slug, name, size);
  } finally {
    await context.close();
  }
}

/** Says which written pictures `projects.ts` doesn't list, or lists at another size; the alt text of the others is for a person to read. */
function compare(written) {
  const listed = new Map(PROJECTS.flatMap((project) => project.screenshots.map((shot) => [shot.src, shot])));
  for (const { src, size, width, height } of written) {
    const shot = listed.get(src);
    if (!shot) console.log(`projects.ts doesn't list ${src} yet (${size}, ${width} x ${height}): add it, with alt text saying what it shows`);
    else if (shot.size !== size || shot.width !== width || shot.height !== height)
      console.log(`projects.ts has ${src} as ${shot.size}, ${shot.width} x ${shot.height}: it is now ${size}, ${width} x ${height}`);
  }
  console.log("Open each picture at 1:1 and read its alt text in projects.ts against it: a live site may show something new.");
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { from: { type: "string" }, slug: { type: "string" }, name: { type: "string" }, size: { type: "string" } },
});

if (values.from) {
  const { from, slug, name, size } = values;
  if (!PROJECTS.some((project) => project.slug === slug)) throw new Error(`--slug: no project is called ${slug}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name ?? "")) throw new Error("--name: lowercase letters, digits and dashes, like map-desktop");
  if (!Object.hasOwn(SIZES, size ?? "")) throw new Error("--size: desktop or phone");
  compare([await write(from, slug, name, size)]);
} else {
  const slugs = positionals[0] ? positionals[0].split(",") : Object.keys(CAPTURES);
  for (const slug of slugs) if (!CAPTURES[slug]) throw new Error(`no captures for ${slug}: ${Object.keys(CAPTURES).join(", ")} have some`);
  const browser = await chromium.launch({ channel: "chrome" });
  const written = [];
  try {
    for (const slug of slugs) for (const shot of CAPTURES[slug]) written.push(await capture(browser, slug, shot));
  } finally {
    await browser.close();
  }
  compare(written);
}
