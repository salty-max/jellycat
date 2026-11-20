import type { ReactNode } from "react";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { DEFAULT_SETTINGS, HEAD_SCRIPT, settingsAttributes, useSettingsSync } from "./core/settings";
import { Crt } from "./os/crt";
import { NotFoundScreen } from "./os/not-found-screen";
import type { Route } from "./+types/root";
import "@fontsource/vt323";
import vt323Latin from "@fontsource/vt323/files/vt323-latin-400-normal.woff2?url";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  // The latin subset is the one every page uses; fonts are fetched anonymously, so the preload must be too or it is fetched twice.
  { rel: "preload", href: vt323Latin, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    // The head script changes the data-* attributes before first paint, so the server's markup and the client's differ on <html> by design.
    <html lang="en" {...settingsAttributes(DEFAULT_SETTINGS)} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Applies the saved phosphor and effects as <html data-*> before first paint. Inline, so scripts/csp.ts hashes it at build. */}
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useSettingsSync();
  return <Outlet />;
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
