import { HOME_PAGE } from "../core/pages";
import { pageMeta } from "../core/site";
import { osRoute } from "../os/os-route";
import { PhoneHome } from "../os/phone/home";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => pageMeta(HOME_PAGE);

// The root draws the OS on this page (app/os/layout.tsx): the desktop with Projects open, or the phone's page.
export const handle = osRoute("home");

// The phone's home page, which the phone's page draws (app/os/phone/phone-layout.tsx) and the desktop never does: it comes in this
// route's chunk.
export default function Home() {
  return <PhoneHome />;
}
