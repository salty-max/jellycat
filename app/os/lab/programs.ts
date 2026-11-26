import type { Program } from "../../lab/run";

/**
 * What the picker and the menu call a program: the file it is (`fizzbuzz.gr`), or its name when it is several (`banks`, whose
 * `main.gas` is the one the editor holds).
 */
export const programFile = (program: Program) => (program.files.length > 1 ? program.name : program.entry);

/** The text of the file the editor holds: the program's entry. */
export const entryText = (program: Program) => program.files.find((file) => file.name === program.entry)?.text ?? "";
