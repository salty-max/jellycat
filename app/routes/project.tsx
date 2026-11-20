import { BootScreen } from "../os/boot-screen";
import { Crt } from "../os/crt";
import { loadReadme } from "../core/readme";
import { projectBySlug } from "../core/projects";
import { pageMeta } from "../core/site";
import { STUDIO_NAME } from "../core/studio";
import type { Route } from "./+types/project";

// /projects/:slug, prerendered for each project (react-router.config.ts). A slug with no project throws a 404, which the root
// ErrorBoundary draws as the not-found screen: that is what a browser shows when Vercel's 404.html loads at such an address.
export async function loader({ params }: Route.LoaderArgs) {
  const readme = loadReadme(params.slug);
  if (!projectBySlug(params.slug) || !readme) throw new Response("Not found", { status: 404 });
  return { blocks: await readme };
}

export const meta: Route.MetaFunction = ({ params }) => {
  const project = projectBySlug(params.slug);
  if (!project) return [{ title: `Page not found · ${STUDIO_NAME}` }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: `${project.name} · ${STUDIO_NAME}`, description: project.description, path: `/projects/${project.slug}` });
};

// The body stays the boot screen until the layout switch (D1b) gives the page its own.
export default function Project() {
  return (
    <main className="h-dvh">
      <Crt>
        <BootScreen />
      </Crt>
    </main>
  );
}
