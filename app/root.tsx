import type { ReactNode } from "react";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useMatches } from "react-router";
import { DEFAULT_SETTINGS, HEAD_SCRIPT, settingsAttributes, useSettingsSync } from "./core/settings";
import { Crt } from "./os/crt";
import { useSoundGesture } from "./os/sound/sound";
import { NOSCRIPT_CSS, OsLayout } from "./os/layout";
import { showsOs } from "./os/os-route";
import { NotFoundScreen } from "./os/not-found-screen";
import type { Route } from "./+types/root";
import "@fontsource/vt323";
import vt323Latin from "@fontsource/vt323/files/vt323-latin-400-normal.woff2?url";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico", sizes: "16x16 32x32 48x48" },
  { rel: "icon", href: "/brand/favicon.svg", type: "image/svg+xml", sizes: "any" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
  { rel: "manifest", href: "/site.webmanifest" },
  // The latin subset is the one every page uses; fonts are fetched anonymously, so the preload must be too or it is fetched twice.
  { rel: "preload", href: vt323Latin, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    // The head script changes the data-* attributes before first paint, so the server's markup and the client's differ on <html> by design.
    <html lang="en" {...settingsAttributes(DEFAULT_SETTINGS)} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        {/* `resizes-visual`: an on-screen keyboard covers the page instead of shrinking it, so a tablet's desktop isn't swapped for the
            phone's page while the Terminal is typed in. Chrome on Android does this already and Safari ignores it; the guard is the
            layout's keyboard hold (app/os/layout.tsx). */}
        <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-visual" />
        {/* Applies the saved phosphor and effects as <html data-*> before first paint. Inline, so scripts/csp.ts hashes it at build. */}
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
        <Meta />
        <Links />
        <noscript>
          <style>{NOSCRIPT_CSS}</style>
        </noscript>
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// The OS lives here, not in the routes, so moving between the home page and a project page never remounts it: those routes only
// name themselves as the OS's (their `handle`) and give it their data, and on a phone they also draw the page (their element, inside
// the phone's layout). Any other route, the not-found page, draws its own element.
export default function App() {
  useSettingsSync();
  useSoundGesture();
  return showsOs(useMatches()) ? <OsLayout /> : <Outlet />;
}

// What the router draws while it hydrates an address it has no prerendered data for. On this static site that is only 404.html
// served at an address a route with a loader claims (`/projects/no-such`): its loader then throws the 404 the boundary below
// draws. Drawing the same screen meanwhile lets the page hydrate the markup 404.html holds instead of leaving it behind.
export function HydrateFallback() {
  return (
    <main className="h-dvh">
      <Crt>
        <NotFoundScreen />
      </Crt>
    </main>
  );
}

// Anything a route throws lands here instead of React Router's default screen. The details only show in development.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <main className="h-dvh">
      <Crt>
        {isRouteErrorResponse(error) && error.status === 404 ? (
          <NotFoundScreen />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-6 text-center text-2xl">
            <h1 className="m-0 text-4xl font-normal">Something went wrong</h1>
            <p className="m-0 text-phosphor-dim">Reload the page to start again.</p>
            {import.meta.env.DEV && error instanceof Error ? <pre className="max-w-full overflow-auto text-base text-phosphor-dim">{error.stack}</pre> : null}
          </div>
        )}
      </Crt>
    </main>
  );
}
