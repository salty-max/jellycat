import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PageSource } from "../../core/shell";
import { LineView, Readme } from "./output";
import { KeyBar } from "./key-bar";
import type { FullScreenApi } from "./full-screen";

/** `top`, a percentage or `end`, as `docs/design.md` Readme sets it in the top border. */
function position(scroller: HTMLElement): string {
  const max = scroller.scrollHeight - scroller.clientHeight;
  if (scroller.scrollTop >= max - 1) return "end";
  if (scroller.scrollTop < 1) return "top";
  return `${Math.round((scroller.scrollTop / max) * 100)}%`;
}

const lineHeight = (element: HTMLElement) => parseFloat(getComputedStyle(element).lineHeight) || 23;

/** `less` and `more`: a file full screen, the path in the top border, the position on the right and the key bar below. */
export function Pager({ path, source, api }: { path: string; source: PageSource; api: FullScreenApi }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [where, setWhere] = useState("top");

  const update = () => {
    if (scroller.current) setWhere(position(scroller.current));
  };

  // The key handler reads the scroller when a key arrives, so it is set once.
  const keys = (key: string): boolean => {
    const view = scroller.current;
    if (!view) return false;
    const line = lineHeight(view);
    const page = Math.max(1, Math.floor(view.clientHeight / line) - 1) * line;
    if (key === "j" || key === "ArrowDown" || key === "Enter") view.scrollTop += line;
    else if (key === "k" || key === "ArrowUp") view.scrollTop -= line;
    else if (key === " " || key === "PageDown" || key === "f") view.scrollTop += page;
    else if (key === "b" || key === "PageUp") view.scrollTop -= page;
    else if (key === "g" || key === "Home") view.scrollTop = 0;
    else if (key === "G" || key === "End") view.scrollTop = view.scrollHeight;
    else if (key === "q" || key === "Escape") api.close();
    else return false;
    update();
    return true;
  };
  const latest = useRef(keys);
  useLayoutEffect(() => {
    latest.current = keys;
  });
  useEffect(() => api.onKey((key) => latest.current(key)), [api]);

  // A README that arrives late, or a window that is resized, moves the end.
  useEffect(() => {
    const view = scroller.current;
    if (!view?.firstElementChild || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(update);
    watch.observe(view);
    watch.observe(view.firstElementChild);
    return () => watch.disconnect();
  }, []);

  useLayoutEffect(update, []);

  return (
    <div className="sh-full">
      <div className="sh-pane sh-pager">
        <span className="sh-pt sh-pt-path">{path}</span>
        <span className="sh-pt sh-pt-right">{where}</span>
        <div ref={scroller} className="sh-pager-text" role="region" aria-label={path} tabIndex={0} onScroll={update}>
          <div>
            {source.kind === "readme" ? <Readme slug={source.slug} /> : source.lines.map((line, index) => <LineView key={index} line={line} />)}
          </div>
        </div>
      </div>
      <KeyBar
        keys={[
          { key: "j k", label: "scroll", send: "j" },
          { key: "Space b", label: "page", send: " " },
          { key: "q", label: "quit", send: "q" },
        ]}
        onKey={keys}
      />
    </div>
  );
}
