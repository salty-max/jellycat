import { rename, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "@react-router/dev/config";

// A static site: no server at runtime. Each listed path is prerendered to its own HTML file at build time (search engines and link
// previews read real HTML). Phase 1 adds each project's page here.
//
// /404 is the not-found route (`*`) rendered once. After the build it moves to 404.html, the file Vercel (and `pnpm preview`)
// serves with a 404 status at any address that has no file. React Router's SPA fallback goes: every address either has its own
// file or gets 404.html, so the fallback would only be one more page answering 200.
export default {
  ssr: false,
  prerender: ["/", "/404"],
  async buildEnd({ reactRouterConfig }) {
    const client = join(reactRouterConfig.buildDirectory, "client");
    await rename(join(client, "404", "index.html"), join(client, "404.html"));
    await rm(join(client, "404"), { recursive: true });
    await rm(join(client, "__spa-fallback.html"), { force: true });
  },
} satisfies Config;
