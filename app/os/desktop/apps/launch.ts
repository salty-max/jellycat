import { projectBySlug } from "../../../core/projects";
import { useLabRequests } from "../../lab/request";
import { useWindows } from "../windows/store";
import { FOLDER_TITLES, type FolderId, type Target } from "./folder-model";

/** The window ids, one per thing: a second open of the same thing brings its window forward. */
export const ids = {
  contact: "contact",
  folder: (id: FolderId) => `folder:${id}`,
  info: (slug: string) => `info:${slug}`,
  readme: (slug: string) => `readme:${slug}`,
  viewer: (slug: string) => `viewer:${slug}`,
};

const open = (options: Parameters<ReturnType<typeof useWindows.getState>["open"]>[0]) => useWindows.getState().open(options);

export const openFolder = (id: FolderId) =>
  open({ id: ids.folder(id), app: "folder", title: FOLDER_TITLES[id], size: { w: 380, h: 232 }, props: { folder: id } });

/** The Info window. Its height is the content's: the app sets it once drawn. */
export function openInfo(slug: string) {
  const project = projectBySlug(slug);
  if (project) open({ id: ids.info(slug), app: "info", title: `${project.name} Info`, size: { w: 380, h: 300 }, props: { slug } });
}

export function openProjectReadme(slug: string) {
  const project = projectBySlug(slug);
  if (project) open({ id: ids.readme(slug), app: "project-readme", title: `${project.name} Readme`, size: { w: 460, h: 380 }, props: { slug } });
}

/** A project's screenshot viewer window. */
export function openViewer(slug: string) {
  const project = projectBySlug(slug);
  if (project) open({ id: ids.viewer(slug), app: "viewer", title: `${project.name} Screenshots`, size: { w: 470, h: 384 }, props: { slug } });
}

export const openStudioReadme = () => open({ app: "readme", title: "Readme", size: { w: 340, h: 210 } });
export const openControlPanel = () => open({ app: "panel", title: "Control Panel", size: { w: 400, h: 196 } });
export const openTerminal = () => open({ app: "terminal", title: "Terminal", size: { w: 410, h: 240 } });
/**
 * Opens or raises the Lab. With a program (`gero run`), the window picks it, and runs it when `run` says so, however open it is.
 * A plain open of a closed Lab drops a request nothing took (a window that failed to load); raising a Lab still loading keeps it.
 */
export function openLab(request?: { program: string; run: boolean }) {
  if (request) useLabRequests.getState().ask(request);
  else if (!Object.values(useWindows.getState().windows).some((window) => window.app === "lab")) useLabRequests.getState().ask(null);
  return open({ app: "lab", title: "Lab", size: { w: 532, h: 432 } });
}

/** The Contact window: the form, 380x370 as the mockup has it. `/contact` opens it too (page-windows.ts). */
export const openContact = () => open({ id: ids.contact, app: "contact", title: "Contact", size: { w: 380, h: 370 } });

/** Opens what an item or an icon stands for. `openProject` is the desktop's (it also moves the address). */
export function openTarget(target: Target, openProject: (slug: string) => void) {
  if (target.type === "folder") openFolder(target.id);
  else if (target.type === "project") openProject(target.slug);
  else if (target.app === "readme") openStudioReadme();
  else if (target.app === "terminal") openTerminal();
  else if (target.app === "lab") openLab();
  else if (target.app === "contact") openContact();
  else openControlPanel();
}

/** What a desktop icon opens, by the icon's id (`desktop-icons.ts`). */
export const ICON_TARGETS: Record<string, Target> = {
  hd: { type: "folder", id: "hd" },
  projects: { type: "folder", id: "projects" },
  readme: { type: "app", app: "readme" },
  terminal: { type: "app", app: "terminal" },
  lab: { type: "app", app: "lab" },
  contact: { type: "app", app: "contact" },
  trash: { type: "folder", id: "trash" },
};
