import { pageByPath } from "../core/pages";
import { pageMeta } from "../core/site";
import { PhoneContact } from "../os/contact/contact-page";
import { osRoute } from "../os/os-route";
import type { Route } from "./+types/contact";

// /contact, prerendered (app/core/pages.ts lists it). The desktop opens the Contact window over Projects at this address, as it does
// a project's Info window; closing it goes back to `/`.
export const meta: Route.MetaFunction = () => pageMeta(pageByPath("/contact")!);

// The root draws the OS on this page (app/os/layout.tsx).
export const handle = osRoute("contact");

// The phone's page, drawn by the phone layout inside its own (app/os/phone/phone-layout.tsx): its code comes in this route's chunk,
// the desktop never draws it. The stylesheet it brings is for this address alone, so 404.html's head doesn't change (R1's note).
export default function Contact() {
  return <PhoneContact />;
}
