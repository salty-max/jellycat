import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { complete, historyStep } from "../../core/complete";
import { homePath } from "../../core/fs";
import type { Block } from "../../core/readme";
import { useSettings } from "../../core/settings";
import { banner, lastLogin, newSession, prompt, run, welcome, type Effect, type Line, type PageSource, type Session } from "../../core/shell";
import { ShellContext } from "./context";
import type { FullScreenApi, FullScreenSlot, FullScreenView, KeyHandler } from "./full-screen";
import { LineView } from "./output";
import { Pager } from "./pager";
import { Slot } from "./placeholder";
import "./shell.css";

export interface ShellProps {
  /** An `open` ran (or a project's name was pressed): the host shows the project. The card is already printed. */
  onOpenProject?: (slug: string) => void;
  /**
   * A line, or several one after the other, run at first paint after the welcome as if typed: a project's page passes
   * `["open hundo", "cat ~/projects/web/hundo/README"]`. Their effects are not performed; the log opens on the first one.
   */
  initialCommand?: string | readonly string[];
  /** README blocks the host already loaded, by slug: `cat` prints these instead of loading the chunk (a deep link's, from the page's loader). */
  readmes?: Readonly<Record<string, readonly Block[]>>;
  /**
   * `less` or `more` ran on a file. The host that shows files its own way (the desktop's Terminal opens a README's window) takes it
   * here and returns the lines to print in its place; null leaves it to the shell's pager.
   */
  onPage?: (page: { command: "less" | "more"; path: string; source: PageSource }) => readonly Line[] | null;
  /** The host's full-screen views, `browse` and the viewer. Without one the shell shows a placeholder saying so. */
  fullScreen?: FullScreenSlot;
  /** Focus the prompt once mounted, on a screen with a pointer and a keyboard; never on a phone, where it would raise the keyboard. */
  autoFocus?: boolean;
}

interface Item {
  id: number;
  line: Line;
  /** Part of the session the page prerendered. */
  initial?: boolean;
}

type PageView = { kind: "page"; command: "less" | "more"; path: string; source: PageSource };
interface Full {
  view: FullScreenView | PageView;
  /** What `q` goes back to: the prompt (null) or the view that paged. */
  back: Full | null;
}

const MAX_LINES = 300;
const text = (value: string): Line => [{ kind: "text", text: value }];

/** The log at first paint: the welcome, and each initial command's echo and output. Pure, so server and client agree. */
function firstPaint(initialCommand: string | readonly string[] | undefined): { items: Item[]; session: Session } {
  let session = newSession();
  const lines: Item[] = welcome().map((line, id) => ({ id, line }));
  for (const command of typeof initialCommand === "string" ? [initialCommand] : (initialCommand ?? [])) {
    const result = run(command, session, { now: new Date(0) });
    const shown = [text(prompt(session.cwd) + command), ...result.lines];
    shown.forEach((line) => lines.push({ id: lines.length, line, initial: true }));
    session = result.session;
  }
  return { items: lines, session };
}

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The terminal over `app/core/shell.ts`: it fills its box, full screen on a phone or inside the desktop's Terminal window. The
 * runner is pure; this component prints what it returns, performs its effects and draws the prompt, the pager and the status bar.
 */
export function Shell({ onOpenProject, initialCommand, readmes, onPage, fullScreen, autoFocus = false }: ShellProps) {
  const [first] = useState(() => firstPaint(initialCommand));
  const [items, setItems] = useState(first.items);
  const [session, setSession] = useState(first.session);
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(first.session.history.length);
  const [focused, setFocused] = useState(false);
  const [full, setFull] = useState<Full | null>(null);
  const [busy, setBusy] = useState(false);
  const [loginRun, setLoginRun] = useState(0);
  const [clock, setClock] = useState("");
  const set = useSettings((state) => state.set);

  const input = useRef<HTMLInputElement>(null);
  const terminal = useRef<HTMLDivElement>(null);
  const nextId = useRef(first.items.length);
  const keyHandler = useRef<KeyHandler | null>(null);
  const skip = useRef(false);
  const wake = useRef<(() => void) | null>(null);
  const echoed = useRef<HTMLDivElement>(null);

  const toItems = (lines: readonly Line[]): Item[] => lines.map((line) => ({ id: nextId.current++, line }));
  const print = (lines: readonly Line[]) => {
    const added = toItems(lines);
    setItems((log) => [...log, ...added].slice(-MAX_LINES));
  };

  const skipLogin = () => {
    skip.current = true;
    wake.current?.();
  };

  // The API a full-screen view gets: stable, so its effects don't restart.
  const api = useMemo<FullScreenApi>(
    () => ({
      close: () => setFull((current) => current?.back ?? null),
      page: (path, source) => setFull((current) => ({ view: { kind: "page", command: "less", path, source }, back: current })),
      onKey: (handler) => {
        keyHandler.current = handler;
        return () => {
          if (keyHandler.current === handler) keyHandler.current = null;
        };
      },
    }),
    [],
  );

  const rows = () => {
    const view = terminal.current;
    if (!view) return 0;
    return Math.floor(view.clientHeight / (parseFloat(getComputedStyle(view).lineHeight) || 23));
  };

  const logout = () => {
    skip.current = reducedMotion();
    setFull(null);
    setSession(newSession());
    setHistoryIndex(0);
    setValue("");
    setItems([]);
    setBusy(true);
    setLoginRun((count) => count + 1);
  };

  const perform = (effect: Effect) => {
    switch (effect.kind) {
      case "theme":
        return set("phosphor", effect.phosphor);
      case "crt":
        set("scanlines", effect.on);
        return set("glow", effect.on);
      case "openProject":
        return onOpenProject?.(effect.slug);
      case "viewProject":
        return setFull({ view: { kind: "view", slug: effect.slug }, back: null });
      case "browse":
        return setFull({ view: { kind: "browse" }, back: null });
      case "page": {
        const taken = onPage?.({ command: effect.command, path: effect.path, source: effect.source });
        if (taken) return print(taken);
        // `more` prints a file that fits the screen; `less` and a README always page.
        if (effect.command === "more" && effect.source.kind === "lines" && effect.source.lines.length <= rows() - 2) return print(effect.source.lines);
        return setFull({ view: { kind: "page", command: effect.command, path: effect.path, source: effect.source }, back: null });
      }
      case "logout":
        return logout();
      case "clear":
        return;
    }
  };

  // The first command or keystroke lets the log follow its end again.
  const unanchor = () => {
    anchored.current = false;
  };

  const exec = (line: string) => {
    unanchor();
    const result = run(line, session, { now: new Date() });
    const cleared = result.effects.some((effect) => effect.kind === "clear");
    // `clear` empties the log first, the echo of its own line included.
    const added = toItems(cleared ? result.lines : [text(prompt(session.cwd) + line), ...result.lines]);
    setItems((log) => [...(cleared ? [] : log), ...added].slice(-MAX_LINES));
    setSession(result.session);
    setHistoryIndex(result.session.history.length);
    setValue("");
    setCaret(0);
    result.effects.forEach(perform);
  };

  // A pressed name or command: the view in front is closed, the line runs.
  const runLine = useCallback(
    (line: string) => {
      if (busy) return skipLogin();
      setFull(null);
      exec(line);
    },
    // exec closes over the current session, so it follows it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, session, onOpenProject],
  );

  // The typed login, on logout and exit only: the banner, the user name typed, then the last login and the welcome.
  useEffect(() => {
    if (!loginRun) return;
    let live = true;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        if (skip.current || !live) return resolve();
        const done = () => {
          clearTimeout(timer);
          wake.current = null;
          resolve();
        };
        const timer = setTimeout(done, ms);
        wake.current = done;
      });
    (async () => {
      const head = toItems([text(banner()), []]);
      const typed = nextId.current++;
      const log = (field: string) => [...head, { id: typed, line: text(`jellycat login: ${field}`) }];
      setItems(head);
      await wait(500);
      if (!live) return;
      setItems(log(""));
      await wait(400);
      let name = "";
      for (const char of "guest") {
        if (!live) return;
        name += char;
        setItems(log(name));
        await wait(90);
      }
      await wait(250);
      if (!live) return;
      setItems((current) => [...current, ...toItems([...lastLogin(new Date()), ...welcome()])]);
      skip.current = false;
      setBusy(false);
    })();
    return () => {
      live = false;
      wake.current = null;
    };
  }, [loginRun]);

  // Client-only: the clock is not in the markup the server renders.
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (autoFocus && matchMedia("(hover: hover) and (pointer: fine)").matches) input.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // The log follows its end; a session that opens with a command starts at that command's line.
  const started = useRef(false);
  const anchored = useRef(first.items.some((item) => item.initial));
  const stick = useCallback(() => {
    if (anchored.current) return;
    if (terminal.current) terminal.current.scrollTop = terminal.current.scrollHeight;
  }, []);
  useLayoutEffect(() => {
    const view = terminal.current;
    if (!view) return;
    if (!started.current && echoed.current) {
      view.scrollTop = echoed.current.offsetTop - parseFloat(getComputedStyle(view).paddingTop);
    } else stick();
    started.current = true;
  }, [items, full, value, stick]);

  useLayoutEffect(() => {
    const field = input.current;
    if (field && document.activeElement === field && (field.selectionStart !== caret || field.selectionEnd !== caret)) field.setSelectionRange(caret, caret);
  }, [value, caret]);

  const edit = (next: string) => {
    setValue(next);
    setCaret(next.length);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (busy) {
      skipLogin();
      event.preventDefault();
      return;
    }
    // In a full-screen view every key is the view's; none reaches the prompt behind it.
    if (full) {
      // The browser's own shortcuts (Cmd-F, Ctrl-L) are not the view's keys.
      if (event.metaKey || event.ctrlKey || event.key === "Tab") return;
      keyHandler.current?.(event.key);
      event.preventDefault();
      return;
    }
    const { key } = event;
    if (key === "Enter") {
      event.preventDefault();
      exec(value);
    } else if (key === "Tab") {
      event.preventDefault();
      const done = complete(value, session.cwd);
      if (done.options.length) print([text(prompt(session.cwd) + value), text(done.options.join("  "))]);
      edit(done.line);
    } else if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      const step = historyStep(session.history, historyIndex, key === "ArrowUp" ? "up" : "down");
      if (step) {
        setHistoryIndex(step.index);
        edit(step.line);
      }
    } else if (event.ctrlKey && key === "l") {
      event.preventDefault();
      setItems([]);
    } else if (event.ctrlKey && key === "c") {
      event.preventDefault();
      print([text(prompt(session.cwd) + value + "^C")]);
      setHistoryIndex(session.history.length);
      edit("");
    } else if (event.ctrlKey && key === "u") {
      event.preventDefault();
      edit("");
    }
  };

  const pointInput = (field: HTMLInputElement) => {
    setCaret(field.selectionStart ?? field.value.length);
  };

  const context = useMemo(() => ({ run: runLine, readmes: readmes ?? {}, settled: stick }), [runLine, readmes, stick]);

  const windowName = !full ? "jsh" : full.view.kind === "page" ? full.view.command : full.view.kind;
  const slot = full && full.view.kind !== "page" ? full.view : null;
  const inFront = full?.view;

  return (
    <ShellContext.Provider value={context}>
      <div
        className="sh crt-glow"
        data-focus={focused}
        onKeyDown={(event) => {
          // A key on a link in a full-screen view (it has the focus) still belongs to the view; Enter and Tab stay the link's.
          if (event.target === input.current || !full || event.key === "Enter" || event.key === "Tab" || event.metaKey || event.ctrlKey) return;
          event.preventDefault();
          keyHandler.current?.(event.key);
          input.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (busy) return skipLogin();
          // Anywhere on the screen but a link, and not while selecting text: the prompt takes the focus.
          if ((event.target as HTMLElement).closest("a, button") || String(getSelection())) return;
          input.current?.focus({ preventScroll: true });
        }}
      >
        <div ref={terminal} className="sh-term" hidden={!!full}>
          <div role="log" aria-label="Terminal output">
            {items.map((item, index) => (
              <div key={item.id} ref={item.initial && !items[index - 1]?.initial ? echoed : undefined} className="sh-item">
                <LineView line={item.line} heading={!!item.initial} />
              </div>
            ))}
          </div>
          {!busy && (
            <div className="sh-prompt" aria-hidden="true">
              <span>{prompt(session.cwd)}</span>
              <span>{value.slice(0, caret)}</span>
              <span className="sh-cursor">{value[caret] ?? " "}</span>
              <span>{value.slice(caret + 1)}</span>
            </div>
          )}
        </div>
        {inFront?.kind === "page" && <Pager key={`${inFront.path}`} path={inFront.path} source={inFront.source} api={api} />}
        {slot && <Slot view={slot} api={api} render={fullScreen} />}
        <div className="sh-bar inverse">
          <span>[jellycat] 0:{windowName}*</span>
          <span className="sh-bar-right">{homePath(session.cwd)}</span>
          <span suppressHydrationWarning>{clock}</span>
        </div>
        <input
          ref={input}
          className="sh-input"
          aria-label="Terminal input"
          value={value}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          onChange={(event) => {
            unanchor();
            setValue(event.target.value);
            pointInput(event.target);
          }}
          onSelect={(event) => pointInput(event.currentTarget)}
          onKeyUp={(event) => pointInput(event.currentTarget)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </ShellContext.Provider>
  );
}
