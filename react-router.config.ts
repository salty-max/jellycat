import { rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "@react-router/dev/config";
import { PAGES } from "./app/core/pages";
import { pageUrl } from "./app/core/site";
import { writePolicies } from "./scripts/csp";

const PATHS = PAGES.map((page) => page.path);

// A static site: no server at runtime. Each listed path is prerendered to its own HTML file at build time (search engines and link
// previews read real HTML): every page app/core/pages.ts lists, the home page and a page for each project in the data.
//
// /404 is the not-found route (`*`) rendered once. After the build it moves to 404.html, the file Vercel (and `pnpm preview`)
// serves with a 404 status at any address that has no file. React Router's SPA fallback goes: every address either has its own
// file or gets 404.html, so the fallback would only be one more page answering 200. Then every page left, 404.html included,
// gets its Content-Security-Policy (scripts/csp.ts).
export default {
  ssr: false,
  prerender: [...PATHS, "/404"],
  async buildEnd({ reactRouterConfig }) {
    const client = join(reactRouterConfig.buildDirectory, "client");
    await rename(join(client, "404", "index.html"), join(client, "404.html"));
    await rm(join(client, "404"), { recursive: true });
    await rm(join(client, "__spa-fallback.html"), { force: true });
    await writeFile(
      join(client, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PATHS.map((path) => `  <url><loc>${pageUrl(path)}</loc></url>\n`).join("")}</urlset>\n`,
    );
    await writeFile(join(client, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${pageUrl("/sitemap.xml")}\n`);
    await writePolicies(client);
  },
} satisfies Config;
