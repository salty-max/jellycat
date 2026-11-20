import type { ReactNode } from "react";

/**
 * The tube: the phosphor screen, its corners rounded as the mockups' frames are, with the scanline layer and the flicker layer on
 * top of whatever it shows. Which effects run is not a prop: it is the `<html data-*>` attributes (app/core/settings.ts), so the
 * first paint already has them.
 */
export function Crt({ children }: { children: ReactNode }) {
  return (
    <div className="relative size-full overflow-hidden rounded-[22px] bg-screen text-phosphor crt-glow">
      {children}
      <div aria-hidden="true" className="crt-flicker" />
      <div aria-hidden="true" className="crt-overlay" />
    </div>
  );
}
