import { useEffect, useRef, useState } from "react";
import { DEFAULT_PROGRAM } from "../../lab/samples";
import { sharedRunner, useGero } from "../../lab/use-gero";
import type { Runner } from "../../lab/run";
import { selectActive, useWindows } from "../desktop/windows/store";
import { LabView } from "./lab-view";
import { entryText } from "./programs";

/**
 * The Lab's window: Gero's programs, an editor for the picked one, Run and Reset. It opens on `fizzbuzz`. An edit lasts while the
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

  const run = () => {
    // The programs could not be fetched: the next try fetches them again.
    if (!program) {
      if (gero.programsError) gero.reloadPrograms();
      return;
    }
    gero.run({ ...program, files: program.files.map((file) => (file.name === program.entry ? { ...file, text } : file)) });
    // The button is Stop now: it takes the focus while the program runs, and keeps it as Run once it ended.
    action.current?.focus({ preventScroll: true });
  };

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
