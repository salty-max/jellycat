import type { ReactNode } from "react";
import { PhoneCrt } from "./crt";
import { PhoneFooter } from "./footer";
import { PhoneHeader } from "./header";
import "./phone.css";

/**
 * The phone's page around one of its screens: the header, `main`, the footer, and the fixed CRT layer. It carries its own glow and
 * its own CRT layer and sits outside `Crt`: the document scrolls under them, so the sticky header and folder bars hold.
 */
export function PhonePage({ onOpenPanel, panelOpen = false, children }: { onOpenPanel: () => void; panelOpen?: boolean; children: ReactNode }) {
  return (
    <div className="ph crt-glow">
      <PhoneHeader onOpenPanel={onOpenPanel} panelOpen={panelOpen} />
      <main>{children}</main>
      <PhoneFooter />
      <PhoneCrt />
    </div>
  );
}
