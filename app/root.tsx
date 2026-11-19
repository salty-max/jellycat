import type { ReactNode } from "react";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { Crt } from "./os/crt";
import { NotFoundScreen } from "./os/not-found-screen";
import type { Route } from "./+types/root";
import "@fontsource/vt323";
import "./app.css";

export const links: Route.LinksFunction = () => [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-phosphor="green">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
