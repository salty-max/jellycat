import { pageByPath } from "../core/pages";
import { loadReadme } from "../core/readme";
import { projectBySlug } from "../core/projects";
import { pageMeta } from "../core/site";
import { STUDIO_NAME } from "../core/studio";
import { osRoute } from "../os/os-route";
import { usePhoneOutlet } from "../os/phone/outlet";
import { PhoneProject } from "../os/phone/project";
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
  const page = pageByPath(`/projects/${params.slug}`);
  if (!page) return [{ title: `Page not found · ${STUDIO_NAME}` }, { name: "robots", content: "noindex" }];
  return pageMeta(page);
};

// The root draws the OS on this page (app/os/layout.tsx): the desktop with the project's Info window open over Projects, or the
// phone's page.
export const handle = osRoute("project");

// The project's page on a phone, with its README from this loader's blocks, so the prerendered text and the first client render are
// the same (null when the README's chunk could not be loaded). The phone's page draws it (app/os/phone/phone-layout.tsx), the desktop
// never does: it comes in this route's chunk. React Router keeps a route's element on a move to another project, so the page is keyed
// on the project and starts afresh.
export default function Project({ loaderData, params }: Route.ComponentProps) {
  const { onOpenPicture } = usePhoneOutlet();
  const project = projectBySlug(params.slug);
  if (!project) return null;
  return <PhoneProject key={project.slug} project={project} blocks={loaderData.blocks} onOpenPicture={(start, opener) => onOpenPicture(project.slug, start, opener)} />;
}
