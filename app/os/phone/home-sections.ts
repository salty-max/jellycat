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

/**
 * The home page's sections below the folders, in order. The Lab is the desktop's only (docs/phase-2.md, Q6): the phone's section is one
 * card to Gero Lab, gero's playground in the browser, with the line its README opens on. Contact's comes with its task (C2).
 */
export const HOME_SECTIONS: readonly HomeSection[] = [
  {
    id: "lab",
    title: "Lab",
    icon: "lab",
    cards: [{ name: "Gero Lab", href: "https://gero-lab.vercel.app", kind: "gero-lab.vercel.app", description: "Browser playground for the Gero VM." }],
  },
];
