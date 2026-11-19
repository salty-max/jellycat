import { BootScreen } from "../os/boot-screen";
import { Crt } from "../os/crt";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
  { title: "Jellycat Studio" },
  { name: "description", content: "Jellycat Studio makes web apps, World of Warcraft addons, and game engines and tools." },
];

export default function Home() {
  return (
    <main className="h-dvh">
      <Crt>
        <BootScreen />
      </Crt>
    </main>
  );
}
