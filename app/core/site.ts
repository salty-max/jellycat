// The OS's name and the site's address, in one place: everything that prints them (`uname`, the welcome, the boot screen,
// the page meta, the sitemap) imports them from here, so a rename or the move to the domain is one edit.

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

/**
 * The head tags every page carries: its title, description, canonical link, and the Open Graph title, description and
 * address. `path` is the page's own address ("/", "/projects/hundo").
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
  ];
}
