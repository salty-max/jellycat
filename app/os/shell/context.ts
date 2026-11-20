import { createContext, useContext } from "react";
import type { Block } from "../../core/readme";

/** What the output needs from the shell around it. */
export interface ShellContextValue {
  /** Runs a line as if it were typed (a pressed name); a full-screen view in front is closed first. */
  run: (line: string) => void;
  /** README blocks the host already has, by slug: `cat` prints these instead of loading the chunk. */
  readmes: Readonly<Record<string, readonly Block[]>>;
  /** A README came in after the output was laid out: the log follows it to the bottom. */
  settled: () => void;
}

export const ShellContext = createContext<ShellContextValue>({ run: () => {}, readmes: {}, settled: () => {} });

export const useShell = () => useContext(ShellContext);
