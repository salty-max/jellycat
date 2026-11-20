import { loadReadme } from "../core/readme";
import { projectBySlug } from "../core/projects";
import { pageMeta } from "../core/site";
import { STUDIO_NAME } from "../core/studio";
import { OS_ROUTE } from "../os/os-route";
import type { Route } from "./+types/project";

// /projects/:slug, prerendered for each project (react-router.config.ts). A slug with no project throws a 404, which the root
// ErrorBoundary draws as the not-found screen: that is what a browser shows when Vercel's 404.html loads at such an address.
export async function loader({ params }: Route.LoaderArgs) {
  const readme = loadReadme(params.slug);
  if (!projectBySlug(params.slug) || !readme) throw new Response("Not found", { status: 404 });
  return { blocks: await readme };
}

// A move to another project's page in the browser (an `open`, back, forward) loads its README's chunk, the one the shell's `cat`
// reads too, instead of the prerendered data. When the chunk can't be loaded the page still changes: `cat` then says so.
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const readme = loadReadme(params.slug);
  if (!projectBySlug(params.slug) || !readme) throw new Response("Not found", { status: 404 });
  return { blocks: await readme.catch(() => null) };
}

export const meta: Route.MetaFunction = ({ params }) => {
  const project = projectBySlug(params.slug);
  if (!project) return [{ title: `Page not found · ${STUDIO_NAME}` }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: `${project.name} · ${STUDIO_NAME}`, description: project.description, path: `/projects/${project.slug}` });
};

// The root draws the OS on this page (app/os/layout.tsx): the shell opens on the project's card and README, from this loader's
// blocks, so the prerendered text and the first client render are the same.
export const handle = OS_ROUTE;

export default function Project() {
  return null;
}
