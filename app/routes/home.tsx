import { pageMeta } from "../core/site";
import { STUDIO_NAME } from "../core/studio";
import { OS_ROUTE } from "../os/os-route";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () =>
  pageMeta({ title: STUDIO_NAME, description: "Jellycat Studio makes web apps, World of Warcraft addons, engines and tools.", path: "/" });

// The root draws the OS on this page (app/os/layout.tsx): the shell's welcome, or the desktop.
export const handle = OS_ROUTE;

export default function Home() {
  return null;
}
