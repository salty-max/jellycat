import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { homePath, nodeAt, sortedChildren, readmePath, type FsDir, type FsNode } from "../../../core/fs";
import { projectBySlug } from "../../../core/projects";
import { newSession, run, type PageSource } from "../../../core/shell";
import type { FullScreenApi, FullScreenView } from "../full-screen";

type BrowseView = Extract<FullScreenView, { kind: "browse" }>;
import { KeyBar } from "../key-bar";
import { Readme } from "../output";
import "./browse.css";

/** Where the browser stood: the directory (names from `~`) and the selected entry. */
interface Position {
  path: readonly string[];
  index: number;
}

// The view is unmounted while it pages a README, so its position waits here, by the view the shell opened (a new `browse` is a new view), until it comes back; quitting forgets it.
const kept = new WeakMap<FullScreenView, Position>();

const PARENT = "..";

const directory = (path: readonly string[]): FsDir => {
  const node = nodeAt(path);
  return node?.kind === "dir" ? node : (nodeAt([]) as FsDir);
};

/** The entries of a directory as the left pane lists them: `..` first (but at `~`), then the directories, then the files. */
const entries = (path: readonly string[]): (FsNode | typeof PARENT)[] => [...(path.length ? [PARENT as typeof PARENT] : []), ...sortedChildren(directory(path))];

const label = (entry: FsNode | typeof PARENT) => (entry === PARENT ? ".." : entry.name + (entry.kind === "dir" ? "/" : ""));

/** What Enter pages for a file: a README by its slug, else the file's own lines, as `less` makes them. */
function sourceOf(path: readonly string[]): PageSource | null {
  const effect = run(`less ${homePath(path)}`, newSession()).effects.find((each) => each.kind === "page");
  return effect?.kind === "page" ? effect.source : null;
}

const host = (url: string) => (url === "-" ? "-" : url.replace(/^https?:\/\//, ""));

/** A project's card as text, the right pane's (the prompt's own card has its links live). */
function CardText({ slug }: { slug: string }) {
  const project = projectBySlug(slug);
  if (!project) return null;
  const pictures = project.screenshots.length;
  const row = (name: string, value: string) => (
    <div className="sh-kr">
      <span className="text-phosphor-dim">{name}</span>
      <span>{value}</span>
    </div>
  );
  return (
    <>
      <div>{project.name}</div>
      <div className="text-phosphor-dim">{project.kind}</div>
      <div>{" "}</div>
      <div>{project.description}</div>
      <div>{" "}</div>
      {row("Stack", project.stack)}
      {row("Link", host(project.link))}
      {row("Source", host(project.source))}
      {pictures > 0 && row("Screenshots", `${pictures} picture${pictures === 1 ? "" : "s"}`)}
      {row("README", readmePath(project))}
    </>
  );
}

/** The right pane: a project's directory shows its card, its README the text, any other directory its names. */
function Peek({ path, entry }: { path: readonly string[]; entry: FsNode | typeof PARENT | undefined }) {
  if (entry === undefined) return <>Empty</>;
  if (entry === PARENT) return <>Parent directory</>;
  if (entry.kind === "readme") return <Readme slug={entry.project.slug} />;
  if (entry.kind === "file") {
    const source = sourceOf([...path, entry.name]);
    return source?.kind === "lines" ? source.lines.map((line, at) => <div key={at}>{line.map((part) => ("text" in part ? part.text : "")).join("") || " "}</div>) : null;
  }
  if (entry.project) return <CardText slug={entry.project.slug} />;
  const names = sortedChildren(entry).map(label).join("\n");
  return <>{names || "Empty"}</>;
}

/** `browse`: the two-pane browser, full screen. j/k and the arrows move, Enter opens, Backspace goes up, q or Esc returns to where it was opened. */
export function Browse({ api, view }: { api: FullScreenApi; view: BrowseView }) {
  const [position, setPosition] = useState<Position>(() => kept.get(view) ?? { path: view.cwd, index: 0 });
  const list = useRef<HTMLDivElement>(null);
  const move = (next: Position) => {
    kept.set(view, next);
    setPosition(next);
  };

  const { path } = position;
  // The status bar shows the directory browsed, and the session's own path again once the view is gone.
  useEffect(() => {
    api.setPath(homePath(path));
    return () => api.setPath(null);
  }, [api, path]);
  const rows = entries(path);
  const index = Math.max(0, Math.min(position.index, rows.length - 1));
  const current = rows[index];
  const title = current === undefined ? "" : current === PARENT ? ".." : label(current);

  const open = (): void => {
    if (current === undefined) return;
    if (current === PARENT) return up();
    if (current.kind === "dir") return move({ path: [...path, current.name], index: 0 });
    const source = sourceOf([...path, current.name]);
    if (source) api.page(homePath([...path, current.name]), source);
  };
  const up = () => {
    if (!path.length) return;
    const parent = path.slice(0, -1);
    const at = entries(parent).findIndex((each) => each !== PARENT && each.name === path[path.length - 1]);
    move({ path: parent, index: Math.max(0, at) });
  };
  const quit = () => {
    kept.delete(view);
    api.close();
  };

  const keys = (key: string): boolean => {
    if (key === "ArrowUp" || key === "k") move({ path, index: (index - 1 + rows.length) % rows.length });
    else if (key === "ArrowDown" || key === "j") move({ path, index: (index + 1) % rows.length });
    else if (key === "Enter" || key === "ArrowRight" || key === "l") {
      // Right and `l` go into a directory and up out of `..`, but never page a file: that is Enter's.
      if (key !== "Enter" && current !== PARENT && current?.kind !== "dir") return true;
      open();
    } else if (key === "Backspace" || key === "ArrowLeft" || key === "h") up();
    else if (key === "q" || key === "Escape") quit();
    else return false;
    return true;
  };
  const latest = useRef(keys);
  useLayoutEffect(() => {
    latest.current = keys;
  });
  useEffect(() => api.onKey((key) => latest.current(key)), [api]);

  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [path, index]);

  return (
    <div className="sh-full">
      <div className="sh-panes">
        <div className="sh-pane">
          <span className="sh-pt">{homePath(path)}</span>
          <div ref={list} className="sh-pc" role="group" aria-label="Directory">
            {rows.map((entry, at) => (
              <button
                key={label(entry)}
                type="button"
                className="sh-row"
                aria-current={at === index ? "true" : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => (at === index ? open() : move({ path, index: at }))}
              >
                {label(entry)}
              </button>
            ))}
          </div>
        </div>
        <div className="sh-pane">
          <span className="sh-pt">{title}</span>
          <div className="sh-pc" role="region" aria-label="Selection">
            <Peek path={path} entry={current} />
          </div>
        </div>
      </div>
      <KeyBar
        keys={[
          { key: "j k", label: "move", send: "ArrowDown" },
          { key: "Enter", label: "open", send: "Enter" },
          { key: "Bksp", label: "up", send: "Backspace" },
          { key: "q", label: "quit", send: "q" },
        ]}
        onKey={keys}
      />
    </div>
  );
}
