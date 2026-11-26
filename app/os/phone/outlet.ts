import { useOutletContext } from "react-router";

/** What the phone's page gives the route's element it draws: a picture opens the viewer at it, giving the focus back to `opener`. */
export type PhoneOutletContext = { onOpenPicture: (slug: string, start: number, opener: HTMLElement) => void };

/**
 * The phone's page's context, for the element of an OS route (app/routes/*), which only the phone's page draws (phone-layout.tsx).
 * Drawn anywhere else (a plain `<Outlet />`), it says so instead of failing on a missing field.
 */
export function usePhoneOutlet(): PhoneOutletContext {
  const context = useOutletContext<PhoneOutletContext | undefined>();
  if (!context) throw new Error("An OS route's element is drawn by the phone's page (PhoneLayout), which gives it its context.");
  return context;
}
