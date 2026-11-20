import type { ReactNode } from "react";

/**
 * The tube: the phosphor screen, with the scanline layer and the flicker layer on top of whatever it shows. Which effects run is not
 * a prop: it is the `<html data-*>` attributes (app/core/settings.ts), so the first paint already has them.
 */
export function Crt({ children }: { children: ReactNode }) {
  return (
    <div className="relative size-full overflow-hidden bg-screen text-phosphor crt-glow">
      {children}
      <div aria-hidden="true" className="crt-flicker" />
      <div aria-hidden="true" className="crt-overlay" />
    </div>
  );
}
