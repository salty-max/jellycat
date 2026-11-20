import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "../../icons/icon";
import { formatClock } from "./format-clock";

/**
 * The time, drawn on the client only: the page is prerendered at build time, and a time baked into it would be wrong at the visit.
 * The server and the first client render both leave it empty, so hydration matches.
 */
const systemNow = () => new Date();

export function Clock({ now = systemNow }: { now?: () => Date }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const tick = () => setText(formatClock(now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [now]);
  return (
    <time suppressHydrationWarning className="ml-auto flex items-center">
      {text}
    </time>
  );
}

/**
 * The menu bar's frame: the cat, a slot for the menus (C2a/D1b fill it), and the clock on the right.
 * The slot is empty until the menus exist.
 */
export function MenuBar({ children, now }: { children?: ReactNode; now?: () => Date }) {
  return (
    <div className="flex h-6 items-stretch border-b border-phosphor bg-screen px-2.5">
      <div className="flex items-center px-[9px]">
        <Icon name="cat" scale={1} />
      </div>
      {children}
      <Clock now={now} />
    </div>
  );
}
