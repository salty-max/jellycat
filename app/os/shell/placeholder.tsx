import { useEffect } from "react";
import type { FullScreenApi, FullScreenSlot, FullScreenView } from "./full-screen";
import { KeyBar } from "./key-bar";

/** Stands where the host's full-screen view goes until it plugs one in: `browse` (D2) and the screenshot viewer (E2). */
export function Placeholder({ view, api }: { view: FullScreenView; api: FullScreenApi }) {
  useEffect(() => api.onKey((key) => (key === "q" || key === "Escape" ? (api.close(), true) : false)), [api]);
  const title = view.kind === "browse" ? "browse" : `view ${view.slug}`;
  return (
    <div className="sh-full">
      <div className="sh-pane sh-pager">
        <span className="sh-pt sh-pt-path">{title}</span>
        <p className="sh-placeholder">{view.kind === "browse" ? "browse" : "view"} is a placeholder until the host plugs it in.</p>
      </div>
      <KeyBar keys={[{ key: "q", label: "quit", send: "q" }]} onKey={(key) => key === "q" && api.close()} />
    </div>
  );
}

/** The host's view for a full-screen effect, or the placeholder when the host has none. */
export function Slot({ view, api, render }: { view: FullScreenView; api: FullScreenApi; render: FullScreenSlot | undefined }) {
  return render?.(view, api) ?? <Placeholder view={view} api={api} />;
}
