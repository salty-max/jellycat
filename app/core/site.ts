// The OS's name and the site's address, in one place: everything that prints them (`uname`, the welcome, the boot screen,
// the page meta, the sitemap) imports them from here, so a rename or the move to the domain is one edit.
// The contact function loads this file as Node does, which resolves no relative import without its extension: `.js`, as app/core/contact-handler.ts's.
import { STUDIO_NAME } from "./studio.js";

/** The operating system's name. */
export const OS_NAME = "Jelly-OS";

/** The version the OS prints beside its name ("Jelly-OS 1.0"), as in the mockups. */
export const OS_VERSION = "1.0";

/**
 * The site's address, with no trailing slash: canonical links, `og:url` and the sitemap are built on it. It is the
 * apex of the domain (`www` redirects to it); the vercel.app address still serves, with canonicals pointing here.
 */
export const SITE_URL = "https://jellycat.fr";

/** The absolute address of a page on the site: `pageUrl("/projects/hundo")`, and `pageUrl("/")` for the home page. */
export function pageUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** A page's link preview image: 1200x630, the size Open Graph and X's `summary_large_image` both take (scripts/og.ts draws it). */
export const PREVIEW_IMAGE = { width: 1200, height: 630, type: "image/png" } as const;

/** The image's path from the site's root: `/og/index.png` for the home page, `/og/projects/hundo.png` for `/projects/hundo`. */
export function pageImagePath(path: string): string {
  return `/og${path === "/" ? "/index" : path}.png`;
}

/**
 * The head tags every page carries: its title, description, canonical link, the Open Graph title, description, address and
 * preview image, and the card X draws it with. `path` is the page's own address ("/", "/projects/hundo"). The image's alt is the
 * page's title.
 */
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }) {
  const url = pageUrl(path);
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: STUDIO_NAME },
    { property: "og:image", content: pageUrl(pageImagePath(path)) },
    { property: "og:image:width", content: String(PREVIEW_IMAGE.width) },
    { property: "og:image:height", content: String(PREVIEW_IMAGE.height) },
    { property: "og:image:type", content: PREVIEW_IMAGE.type },
    { property: "og:image:alt", content: title },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
