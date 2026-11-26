import { Menu } from "@base-ui/react/menu";
import { Fragment, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from "react";
import type { Program } from "../../lab/run";
import { Glyph } from "../icons/icon";
import "../desktop/apps/apps.css";
import "../desktop/menubar/menubar.css";
import { programFile } from "./programs";
import "./lab.css";

export type LabStatus = "idle" | "loading" | "running";

export type LabViewProps = {
  /** The pinned gero version, on the right of the info line. */
  version: string;
  /** Every program, `null` until they are fetched. */
  programs: readonly Program[] | null;
  /** The picked program, `null` while there is none to show (the programs are not there yet). */
  program: Program | null;
  text: string;
  onText: (text: string) => void;
  onPick: (name: string) => void;
  status: LabStatus;
  /** The line at the right of `Output`: how the run is going or ended, or why it could not start. */
  state: string;
  output: string;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
  /** Gives the window's own element, which takes the focus (Enter runs from it). */
  onRoot?: (element: HTMLDivElement | null) => void;
  /** The Run/Stop button, so the window can give it the focus when a run starts. */
  actionRef?: Ref<HTMLButtonElement>;
};

/** Gero's programs first, a separator, then the assembly ones, each in the order the manifest lists them. */
function menuGroups(programs: readonly Program[]) {
  return [programs.filter((program) => program.lang === "gr"), programs.filter((program) => program.lang === "gas")].filter((group) => group.length > 0);
}

/**
 * The Lab's window, drawn from its props: the info line (the file the editor holds, the gero version), the picker, Reset and Run (Stop
 * while it runs), the editor, and the output with the run's state. `LabWindow` holds the state; stories draw the states from props.
 */
export function LabView({ version, programs, program, text, onText, onPick, status, state, output, onRun, onStop, onReset, onRoot, actionRef }: LabViewProps) {
  const outputId = useId();
  const log = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const busy = status !== "idle";

  // The pane keeps its end in view, as the program prints.
  useLayoutEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [output]);

  const setRoot = (element: HTMLDivElement | null) => {
    setContainer(element);
    onRoot?.(element);
  };

  // Ctrl+Enter (⌘+Enter) runs from the editor; Tab is left alone, so it leaves the editor as it leaves every field.
  const onEditorKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!busy) onRun();
    }
  };
  // Enter on the window itself (it has the focus when it opens) runs, as Enter is the Info window's Open Readme.
  const onRootKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.target !== event.currentTarget) return;
    event.preventDefault();
    if (!busy) onRun();
  };

  const loaded = programs !== null;
  const file = program ? programFile(program) : "-";

  return (
    <div ref={setRoot} className="app-pane app-lab" tabIndex={-1} onKeyDown={onRootKey}>
      <div className="app-info">
        <span>{program?.entry ?? "-"}</span>
        <span>{`gero ${version}`}</span>
      </div>
      <div className="app-lab-body">
        <div className="app-lab-row">
          <Menu.Root modal={false}>
            <Menu.Trigger className="app-button app-lab-pick" disabled={!loaded}>
              <span>{file}</span>
              <Glyph name="down" />
            </Menu.Trigger>
            <Menu.Portal container={container}>
              <Menu.Positioner className="menubar-positioner" align="start" sideOffset={2}>
                <Menu.Popup className="menubar-popup app-lab-menu">
                  <Menu.RadioGroup value={program?.name ?? ""} onValueChange={(value) => onPick(value as string)}>
                    {menuGroups(programs ?? []).map((group, index) => (
                      <Fragment key={group[0].lang}>
                        {index > 0 && <Menu.Separator className="menubar-separator" />}
                        {group.map((each) => (
                          <Menu.RadioItem key={each.name} value={each.name} className="menubar-item" closeOnClick>
                            {each.name === program?.name ? <span aria-hidden="true" className="menubar-mark" /> : null}
                            {programFile(each)}
                          </Menu.RadioItem>
                        ))}
                      </Fragment>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <span className="app-lab-gap" />
          <button type="button" className="app-button" onClick={onReset} disabled={!program}>
            Reset
          </button>
          <button ref={actionRef} type="button" className="app-button" data-default="" onClick={busy ? onStop : onRun}>
            {busy ? "Stop" : "Run"}
          </button>
        </div>
        <textarea
          className="app-lab-editor app-lab-scroll"
          aria-label="Program"
          value={text}
          readOnly={!program}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          wrap="off"
          onChange={(event) => onText(event.target.value)}
          onKeyDown={onEditorKey}
        />
        <div className="app-lab-ohead">
          <span id={outputId} className="app-dim">
            Output
          </span>
          <span className="app-lab-state app-dim">
            {/* The state is announced once it has settled; while it changes (loading, running) it is only drawn. */}
            <span role="status">{busy ? "" : state}</span>
            {busy ? <span aria-hidden="true">{state}</span> : null}
          </span>
        </div>
        <div ref={log} role="log" aria-labelledby={outputId} aria-live="off" tabIndex={0} className="app-lab-out app-lab-scroll">
          <div className="app-lab-out-text">{output}</div>
        </div>
      </div>
    </div>
  );
}
