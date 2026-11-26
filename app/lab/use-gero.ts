// What the Lab's window holds of Gero: the programs, the module, a run and what it printed. One module instance and one run at a
// time for the whole page, however often the window opens and closes; the window's own state (the edit, the picked program) is its.
import { useCallback, useEffect, useRef, useState } from "react";
import { GERO_VERSION, GERO_WASM_URL } from "./gero";
import { GeroModule, ModuleLoadError } from "./module";
import { describeOutcome, Runner, type Program } from "./run";
import { loadSamples } from "./samples";

/** The page's one runner: it loads the module on the first Run (`loading gero.wasm`) and keeps it. */
export const sharedRunner = new Runner(() => GeroModule.load(GERO_WASM_URL));

export const COULD_NOT_LOAD_MODULE = "could not load gero.wasm";
export const COULD_NOT_LOAD_PROGRAMS = "could not load the programs";

export interface Gero {
  /** The pinned gero version. */
  version: string;
  /** Every program, `null` until they are fetched (or when they could not be: see `programsError`). */
  programs: readonly Program[] | null;
  programsError: string | null;
  /** Fetches the programs again after a failure. */
  reloadPrograms(): void;
  /** `loading` while the module is fetched (the first Run), `running` while the program runs. */
  status: "idle" | "loading" | "running";
  /** The state line: empty before a run, then `loading gero.wasm`, `running`, how the run ended, or why it could not start. */
  state: string;
  /** What the pane shows. */
  output: string;
  run(program: Program): void;
  /** Ends a run after its current slice. */
  stop(): void;
  /** Ends a run and clears the output and the state. */
  reset(): void;
}

export function useGero(runner: Runner = sharedRunner): Gero {
  const [programs, setPrograms] = useState<readonly Program[] | null>(null);
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [status, setStatus] = useState<Gero["status"]>("idle");
  const [state, setState] = useState("");
  const [output, setOutput] = useState("");
  // A run outlives a render, and the window may close before it ends: nothing is set once the window is gone, or once Reset ended
  // the run that was asking.
  const mounted = useRef(true);
  const current = useRef(0);
  // The id of the run this window started and that has not ended (0 when none): the runner is the page's, and closing a window
  // ends only its own run. An id, not a flag, so the run Reset ended can't clear the mark of the one that followed it.
  const started = useRef(0);

  const fetchPrograms = useCallback(() => {
    loadSamples().then(
      (loaded) => {
        if (mounted.current) setPrograms(loaded);
      },
      () => {
        if (mounted.current) setProgramsError(COULD_NOT_LOAD_PROGRAMS);
      },
    );
  }, []);

  const reloadPrograms = useCallback(() => {
    setProgramsError(null);
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    mounted.current = true;
    fetchPrograms();
    return () => {
      mounted.current = false;
    };
  }, [fetchPrograms]);

  // Closing the window ends its run.
  useEffect(() => {
    const own = started;
    return () => {
      if (own.current !== 0) runner.stop();
    };
  }, [runner]);

  const run = useCallback(
    (program: Program) => {
      const id = ++current.current;
      const live = () => mounted.current && current.current === id;
      const start = () => {
        started.current = id;
        setOutput("");
        setStatus(runner.isLoaded ? "running" : "loading");
        setState(runner.isLoaded ? "running" : "loading gero.wasm");
        runner
          .run(program, (text) => {
            if (live()) {
              setOutput(text);
              setStatus("running");
              setState("running");
            }
          })
          .then(
            (outcome) => {
              if (started.current === id) started.current = 0;
              if (!live()) return;
              setStatus("idle");
              setState(describeOutcome(outcome));
            },
            (error: unknown) => {
              if (started.current === id) started.current = 0;
              if (!live()) return;
              setStatus("idle");
              setState(error instanceof ModuleLoadError ? COULD_NOT_LOAD_MODULE : error instanceof Error ? error.message : String(error));
            },
          );
      };
      if (runner.isRunning) {
        // A run Reset or another Run asked to end is still ending its slice (or loading the module): this one follows it, so the click
        // is never lost.
        runner.stop();
        void runner.whenIdle().then(() => {
          if (live()) start();
        });
      } else start();
    },
    [runner],
  );

  const stop = useCallback(() => runner.stop(), [runner]);

  const reset = useCallback(() => {
    runner.stop();
    current.current++;
    setStatus("idle");
    setState("");
    setOutput("");
  }, [runner]);

  return { version: GERO_VERSION, programs, programsError, reloadPrograms, status, state, output, run, stop, reset };
}
