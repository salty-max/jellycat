import type { IconName } from "../icons/names";

/** A card in a section below the folders, drawn as a project's is: its name (the one link), a dim line, and a line of text. */
export type HomeCard = {
  name: string;
  /** Where the name goes: a page of the site ("/contact") or an https address, which opens in a new tab as every one on the site does. */
  href: string;
  /** The dim line under the name: an address, or what the card is. */
  kind: string;
  description: string;
};

/** A section below the folders: its title bar in inverse video like a folder's, with its icon inverted, then its cards. */
export type HomeSection = {
  /** The section's id, for its heading's. */
  id: string;
  title: string;
  icon: IconName;
  cards: readonly HomeCard[];
};

/** The home page's sections below the folders, in order. The Lab's and Contact's come with their tasks (docs/phase-2.md, L2 and C2). */
export const HOME_SECTIONS: readonly HomeSection[] = [];
