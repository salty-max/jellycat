import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { complete, historyStep } from "../../core/complete";
import { homePath } from "../../core/fs";
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
   * `less` or `more` ran on a file. The host that shows files its own way (the desktop's Terminal opens a README's window) takes it
   * here and returns the lines to print in its place; null leaves it to the shell's pager.
   */
  onPage?: (page: { command: "less" | "more"; path: string; source: PageSource }) => readonly Line[] | null;
  /** `view` ran on a project with pictures. The host shows them its own way (the desktop's Terminal opens the viewer's window) and returns the lines to print. */
  onView?: (slug: string) => readonly Line[] | null;
  /**
   * `gero` ran: the host opens the Lab (on `program`, running it when `run`) and returns the lines to print. Without it the shell says the
   * Lab is not here.
   */
  onOpenLab?: (program: string | null, run: boolean) => readonly Line[];
  /** The Lab's programs' names, asked the first time `gero` is typed: for `gero help`, the error for a name it hasn't, and Tab. */
  onLabPrograms?: () => Promise<readonly string[]>;
  /** The host's full-screen view, `browse`. Without one the shell shows a placeholder saying so. */
  fullScreen?: FullScreenSlot;
  /** Focus the prompt once mounted, on a screen with a pointer and a keyboard; never on a phone, where it would raise the keyboard. */
  autoFocus?: boolean;
}

interface Item {
  id: number;
  line: Line;
}

type PageView = { kind: "page"; command: "less" | "more"; path: string; source: PageSource };
interface Full {
  view: FullScreenView | PageView;
  /** What `q` goes back to: the prompt (null) or the view that paged. */
  back: Full | null;
}

const MAX_LINES = 300;
const text = (value: string): Line => [{ kind: "text", text: value }];

/** The log at first paint: the welcome. Pure, so server and client agree. */
function firstPaint(): { items: Item[]; session: Session } {
  return { items: welcome().map((line, id) => ({ id, line })), session: newSession() };
}

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The terminal over `app/core/shell.ts`: it fills its box, the desktop's Terminal window. The
 * runner is pure; this component prints what it returns, performs its effects and draws the prompt, the pager and the status bar.
 */
export function Shell({ onOpenProject, onPage, onView, onOpenLab, onLabPrograms, fullScreen, autoFocus = false }: ShellProps) {
  const [first] = useState(() => firstPaint());
  const [items, setItems] = useState(first.items);
  const [session, setSession] = useState(first.session);
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(first.session.history.length);
  const [focused, setFocused] = useState(false);
  const [full, setFull] = useState<Full | null>(null);
  const [viewPath, setViewPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** The Lab's programs' names, once `gero` has been typed. */
  const [labPrograms, setLabPrograms] = useState<readonly string[]>([]);
  const [loginRun, setLoginRun] = useState(0);
  const [clock, setClock] = useState("");
  const set = useSettings((state) => state.set);

  const input = useRef<HTMLInputElement>(null);
  const terminal = useRef<HTMLDivElement>(null);
  /** Whether the focus was on a name in the log when the last line ran. */
  const fromLog = useRef(false);
  const nextId = useRef(first.items.length);
  const keyHandler = useRef<KeyHandler | null>(null);
  const skip = useRef(false);
  /** Moves on when the log is emptied (`clear`, a logout) or the shell goes: an answer that waited for the programs is dropped. */
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const wake = useRef<(() => void) | null>(null);

  // The programs' names, fetched the first time `gero` is typed, so Tab has them before the line is run.
  const namesAsked = useRef(false);
  useEffect(() => {
    if (!onLabPrograms || namesAsked.current || !/^gero(\s|$)/.test(value)) return;
    namesAsked.current = true;
    onLabPrograms().then(setLabPrograms, () => (namesAsked.current = false));
  }, [value, onLabPrograms]);

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
      setPath: setViewPath,
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
    return Math.floor(view.clientHeight / (parseFloat(getComputedStyle(view).lineHeight) || 24));
  };

  const logout = () => {
    generation.current++;
    skip.current = reducedMotion();
    setFull(null);
    setSession(newSession());
    setHistoryIndex(0);
    setValue("");
    setItems([]);
    setBusy(true);
    setLoginRun((count) => count + 1);
  };

  // `gero`: the programs' names are fetched the first time (the answer is the host's own cache after that), so a name is checked against
  // them and the lines come a moment after the command's own.
  const gero = async (action: "open" | "run" | "help", program: string | undefined) => {
    if (!onOpenLab || !onLabPrograms) return print([text("gero: the Lab is not available here")]);
    if (action === "open") {
      print(onOpenLab(null, false));
      onLabPrograms().then(setLabPrograms, () => undefined);
      return;
    }
    // What the line printed lands only in the log it was typed in: not after `clear` or a logout, nor once the Terminal is closed.
    const epoch = generation.current;
    let names: readonly string[];
    try {
      names = await onLabPrograms();
    } catch {
      return generation.current === epoch ? print([text("gero: could not load the programs")]) : undefined;
    }
    setLabPrograms(names);
    if (generation.current !== epoch) return;
    if (action === "help") {
      return print([names.flatMap((name, index): Line[number][] => [...(index ? [{ kind: "text", text: "  " } as const] : []), { kind: "command", text: name, command: `gero run ${name}` }])]);
    }
    if (program === undefined || !names.includes(program)) return print([text(`gero: no program named ${program}`)]);
    print(onOpenLab(program, true));
  };

  const perform = (effect: Effect, cwd: readonly string[]) => {
    switch (effect.kind) {
      case "theme":
        return set("phosphor", effect.phosphor);
      case "crt":
        set("scanlines", effect.on);
        return set("glow", effect.on);
      case "openProject":
        return onOpenProject?.(effect.slug);
      case "viewProject": {
        const taken = onView?.(effect.slug);
        return taken ? print(taken) : undefined;
      }
      case "gero":
        return void gero(effect.action, effect.program);
      case "browse":
        return setFull({ view: { kind: "browse", cwd }, back: null });
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

  const exec = (line: string) => {
    const result = run(line, session, { now: new Date() });
    const cleared = result.effects.some((effect) => effect.kind === "clear");
    if (cleared) generation.current++;
    // `clear` empties the log first, the echo of its own line included.
    const added = toItems(cleared ? result.lines : [text(prompt(session.cwd) + line), ...result.lines]);
    setItems((log) => [...(cleared ? [] : log), ...added].slice(-MAX_LINES));
    setSession(result.session);
    setHistoryIndex(result.session.history.length);
    setValue("");
    setCaret(0);
    result.effects.forEach((effect) => perform(effect, result.session.cwd));
  };

  // A pressed name or command: the view in front is closed, the line runs.
  const runLine = useCallback(
    (line: string) => {
      if (busy) return skipLogin();
      // Noted before a full-screen view can hide the log (see the layout effect below).
      fromLog.current = !!terminal.current?.contains(document.activeElement);
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

  // A full-screen view hides the log. Opened from a name in it by the keyboard (Enter on the card's README path), the name had the
  // focus and is gone: the prompt's input takes it, so the view gets the keys typed. Where the focus was is noted when the line
  // runs, since a browser may move it off a hidden name before this runs. A tap never focuses a name, so a phone's keyboard
  // doesn't come up.
  useLayoutEffect(() => {
    if (full && fromLog.current) input.current?.focus({ preventScroll: true });
    fromLog.current = false;
  }, [full]);

  // The log follows its end.
  const stick = useCallback(() => {
    if (terminal.current) terminal.current.scrollTop = terminal.current.scrollHeight;
  }, []);
  useLayoutEffect(stick, [items, full, value, stick]);

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
    } else if (key === "Tab" && !event.shiftKey && value.trim()) {
      // Tab completes the line being typed. On an empty line, and with Shift, it moves the focus as it does anywhere else, so the
      // keyboard can always leave the prompt (for the names above it, or the Terminal window's boxes).
      event.preventDefault();
      const done = complete(value, session.cwd, labPrograms);
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

  const context = useMemo(() => ({ run: runLine, settled: stick }), [runLine, stick]);

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
            {items.map((item) => (
              <div key={item.id} className="sh-item">
                <LineView line={item.line} />
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
          <span className="sh-bar-right">{viewPath ?? homePath(session.cwd)}</span>
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
