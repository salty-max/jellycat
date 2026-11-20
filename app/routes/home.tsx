import { BootScreen } from "../os/boot-screen";
import { pageMeta } from "../core/site";
import { STUDIO_NAME } from "../core/studio";
import { Crt } from "../os/crt";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () =>
  pageMeta({ title: STUDIO_NAME, description: "Jellycat Studio makes web apps, World of Warcraft addons, engines and tools.", path: "/" });

export default function Home() {
  return (
    <main className="h-dvh">
      <Crt>
        <BootScreen />
      </Crt>
    </main>
  );
}
