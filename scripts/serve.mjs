// Serves build/client the way Vercel does: a file at its path, a folder's index.html, and 404.html with a 404 status for anything
// else. `pnpm preview` and the end-to-end tests use it, so a missing page shows up here as it would in production.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import sirv from "sirv";

const ROOT = "build/client";
const PORT = Number(process.env.PORT ?? 4173);
const notFound = readFileSync(`${ROOT}/404.html`);

const files = sirv(ROOT, {
  etag: true,
  onNoMatch: (_req, res) => {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(notFound);
  },
});

createServer(files).listen(PORT, () => console.log(`build/client on http://localhost:${PORT}`));
