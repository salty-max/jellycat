import type { ReactNode } from "react";

/** The tube: the phosphor screen, with the scanline layer on top of whatever it shows. */
export function Crt({ children }: { children: ReactNode }) {
  return (
    <div className="relative size-full overflow-hidden bg-screen text-phosphor crt-glow">
      {children}
      <div aria-hidden="true" className="crt-overlay" />
    </div>
  );
}
