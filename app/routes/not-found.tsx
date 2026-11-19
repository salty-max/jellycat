import { Crt } from "../os/crt";
import { NotFoundScreen } from "../os/not-found-screen";
import type { Route } from "./+types/not-found";

// Every address no other route claims. The build prerenders it as /404 and moves it to 404.html (react-router.config.ts), which
// Vercel and `pnpm preview` serve with a 404 status.
export const meta: Route.MetaFunction = () => [{ title: "Page not found · Jellycat Studio" }, { name: "robots", content: "noindex" }];

export default function NotFound() {
  return (
    <main className="h-dvh">
      <Crt>
        <NotFoundScreen />
      </Crt>
    </main>
  );
}
