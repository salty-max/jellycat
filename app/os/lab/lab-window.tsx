import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_PROGRAM } from "../../lab/samples";
import { sharedRunner, useGero } from "../../lab/use-gero";
import type { Program, Runner } from "../../lab/run";
import { selectActive, useWindows } from "../desktop/windows/store";
import { LabView } from "./lab-view";
import { useLabRequests } from "./request";
import { entryText } from "./programs";

/**
 * The Lab's window: Gero's programs, an editor for the picked one, Run and Reset. It opens on `fizzbuzz`, or on the program `gero run` names. An edit lasts while the
 * window is open (one per program, so going to another program and back finds it), in memory only: nothing is stored.
 */
export function LabWindow({ windowId, runner = sharedRunner }: { windowId: string; runner?: Runner }) {
  const gero = useGero(runner);
  const [picked, setPicked] = useState(DEFAULT_PROGRAM);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const root = useRef<HTMLDivElement>(null);
  const action = useRef<HTMLButtonElement>(null);

  const program = gero.programs?.find((each) => each.name === picked) ?? null;
  const text = program ? (edits[program.name] ?? entryText(program)) : "";

  // On mount, and on a second open of this window (the store counts it in `entered`): the window itself takes the focus, so Enter
  // runs. Not when another window is entered: `entered` drops to 0 then, and the focus is that window's.
  const entered = useWindows((state) => (state.entered?.id === windowId ? state.entered.n : 0));
  const mounted = useRef(false);
  useEffect(() => {
    const element = root.current;
    // The window's code arrives a moment after it opens: a first mount takes the focus only if this is still the window in front.
    const first = !mounted.current && selectActive(useWindows.getState()) === windowId;
    mounted.current = true;
    if (element && (first || entered > 0) && !element.contains(document.activeElement)) element.focus({ preventScroll: true });
  }, [entered, windowId]);

  const start = (target: Program, source: string) => {
    gero.run({ ...target, files: target.files.map((file) => (file.name === target.entry ? { ...file, text: source } : file)) });
    // The button is Stop now: it takes the focus while the program runs, and keeps it as Run once it ended.
    action.current?.focus({ preventScroll: true });
  };

  const run = () => {
    // The programs could not be fetched: the next try fetches them again.
    if (!program) {
      if (gero.programsError) gero.reloadPrograms();
      return;
    }
    start(program, text);
  };

  // `gero run <program>` (or `gero`): the program is picked once the programs are here, and run as the Run button would run it (an edit
  // kept for it is what runs, and a run still going is ended first, as the button's own does). One that names no program is dropped.
  const request = useLabRequests((state) => state.request);
  const programs = gero.programs;
  const reloaded = useRef(0);
  // A layout effect, so a window opened by `gero run gcd` never paints fizzbuzz first.
  useLayoutEffect(() => {
    if (!request) return;
    if (!programs) {
      // The programs could not be fetched: the ask fetches them again, once for each ask.
      if (gero.programsError && reloaded.current !== request.n) {
        reloaded.current = request.n;
        gero.reloadPrograms();
      }
      return;
    }
    useLabRequests.getState().take(request.n);
    const target = programs.find((each) => each.name === request.program);
    if (!target) return;
    gero.reset();
    // An event from outside React (the Terminal's), so the state it moves is set here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicked(target.name);
    if (request.run) start(target, edits[target.name] ?? entryText(target));
    // `start`, `edits` and `gero` are read as they are when the request arrives; only a new request, the programs arriving or failing re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, programs, gero.programsError]);

  return (
    <LabView
      version={gero.version}
      programs={gero.programs}
      program={program}
      text={text}
      onText={(next) => program && setEdits((all) => ({ ...all, [program.name]: next }))}
      onPick={(name) => {
        if (name === picked) return;
        setPicked(name);
        gero.reset();
      }}
      status={gero.status}
      state={gero.state || (gero.programs ? "" : (gero.programsError ?? ""))}
      output={gero.output}
      onRun={run}
      onStop={gero.stop}
      onReset={() => {
        if (program) setEdits((all) => Object.fromEntries(Object.entries(all).filter(([name]) => name !== program.name)));
        gero.reset();
      }}
      onRoot={(element) => (root.current = element)}
      actionRef={action}
    />
  );
}
