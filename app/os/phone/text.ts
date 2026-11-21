import { README } from "../../core/studio";

/** `3 pictures`, or `1 picture`. */
export const pictureCount = (count: number) => `${count} picture${count === 1 ? "" : "s"}`;

/** `11 items`, or `1 item`: the folder window's info line. */
export const itemCount = (count: number) => `${count} item${count === 1 ? "" : "s"}`;

/** The studio Readme's line about what the studio makes (its third line). */
export const STUDIO_LINE = README[2].join("");
