import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { README, type Span, type TextFile } from "../../../core/studio";
import { ShellContext } from "../../shell/context";
import { Readme } from "../../shell/output";
import "../../shell/shell.css";
import { useWindows } from "../windows/store";
import { useDesktop } from "./context";
import "./apps.css";

/** A text file as lines of spans: a link (an address, the e-mail) is underlined. */
export function TextView({ file }: { file: TextFile }) {
  const span = (part: Span, index: number) =>
    typeof part === "string" ? (
      part
    ) : (
      <a key={index} href={part.href} {...(part.href.startsWith("https://") ? { target: "_blank", rel: "noopener" } : {})}>
        {part.text}
      </a>
    );
  return (
    <div className="app-txt">
      {file.map((line, index) => (
        <div key={index}>{line.length ? line.map(span) : " "}</div>
      ))}
    </div>
  );
}

/** The studio's Readme: its text, from `app/core/studio.ts`, as the shell's `~/README` is. */
export function StudioReadme() {
  return <TextView file={README} />;
}

/**
 * A project's README in a text window that scrolls, with the 1-bit scroll bar. It takes the focus, so the window's title bar shows
 * it and the text has no ring of its own; Esc closes it. A link to another project opens that project's Info window.
 */
export function ProjectReadme({ windowId, slug }: { windowId: string; slug: string }) {
  const { openProject } = useDesktop();
  const doc = useRef<HTMLDivElement>(null);
  useEffect(() => doc.current?.focus({ preventScroll: true }), []);
  // The README's links run the shell's `open <slug>`: here that opens the project.
  const context = useMemo(
    () => ({
      run: (line: string) => {
        const match = /^open (\S+)$/.exec(line);
        if (match) openProject(match[1]);
      },
      readmes: {},
      settled: () => {},
    }),
    [openProject],
  );
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") useWindows.getState().close(windowId);
  };
  return (
    <div className="app-pane">
      <div ref={doc} className="app-doc" tabIndex={0} onKeyDown={onKeyDown}>
        <ShellContext.Provider value={context}>
          <Readme slug={slug} />
        </ShellContext.Provider>
      </div>
    </div>
  );
}

/** Stands where the screenshot viewer goes until it is built (E2 replaces this app in the registry). */
export function ViewerPlaceholder() {
  return <p className="m-0">The screenshot viewer is a placeholder until it is built.</p>;
}
