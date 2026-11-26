import { PROJECTS } from "./projects";
import { CONTACT_EMAIL, STUDIO_NAME } from "./studio";

// Every page the site has, in one list: the routes' `meta`, the prerender list and the sitemap (react-router.config.ts) read it, so a
// new page is one entry here and is listed, prerendered and described everywhere at once.

/** The kinds of page, as an OS route's handle names them (app/os/os-route.ts). */
export type PageKind = "home" | "project" | "contact";

type PageFields = {
  /** The page's own address, from the site's root: "/", "/projects/hundo". */
  path: string;
  /** The document's title. */
  title: string;
  /** The meta description, and Open Graph's. */
  description: string;
};

/** A page, with what its kind needs besides: a project page names its project. */
export type Page = PageFields & ({ kind: "home" } | { kind: "project"; slug: string } | { kind: "contact" });

/** The home page. */
export const HOME_PAGE: Page = {
  kind: "home",
  path: "/",
  title: STUDIO_NAME,
  description: "Jellycat Studio makes web apps, World of Warcraft addons, engines and tools.",
};

/** The contact page: the phone's form, and on the desktop the address that opens the Contact window. */
export const CONTACT_PAGE: Page = {
  kind: "contact",
  path: "/contact",
  title: `Contact · ${STUDIO_NAME}`,
  description: `A message from this page goes by email to ${CONTACT_EMAIL}.`,
};

/** Every page, in the sitemap's order: the home page, each project's in the data's order, then the contact page. */
export const PAGES: readonly Page[] = [
  HOME_PAGE,
  ...PROJECTS.map((project): Page => ({
    kind: "project",
    slug: project.slug,
    path: `/projects/${project.slug}`,
    title: `${project.name} · ${STUDIO_NAME}`,
    description: project.description,
  })),
  CONTACT_PAGE,
];

/** The page at this address, if the site has one. */
export function pageByPath(path: string): Page | undefined {
  return PAGES.find((page) => page.path === path);
}
