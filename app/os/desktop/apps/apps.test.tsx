import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, useSettings } from "../../../core/settings";
import { settle } from "../../../test-act";
import type { OsPage } from "../../os-route";
import { Desktop } from "../desktop";
import { useWindows } from "../windows/store";
import { useFolderViews } from "./folder-view";
import { ids, openFolder } from "./launch";

// The Lab's window is a chunk loaded when it opens: its first import in a run transforms the module and what it pulls in, which on a
// busy machine takes longer than a test's budget. A hook warms it (with the hook's own budget), so the test waits only for the render.
beforeAll(async () => {
  await import("../../lab/lab-window");
}, 60_000);

beforeEach(() => {
  // jsdom has no matchMedia: no pointer, so the Terminal doesn't focus its prompt itself.
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  useWindows.setState(useWindows.getInitialState(), true);
  useFolderViews.setState(useFolderViews.getInitialState(), true);
  useSettings.setState({ ...DEFAULT_SETTINGS });
});

const win = (name: string) => screen.findByRole("dialog", { name });
/** A project's page, as the layout hands it to the desktop. */
const projectPage = (slug: string): OsPage => ({ page: "project", params: { slug }, data: { blocks: null } });
const contactPage: OsPage = { page: "contact", params: {}, data: undefined };
const titles = () => Object.values(useWindows.getState().windows).map((window) => window.title);

describe("the desktop's first windows", () => {
  it("opens Projects, with its four folders read from the file system", async () => {
    render(<Desktop />);
    const projects = await win("Projects");
    expect(within(projects).getByText("4 items")).toBeInTheDocument();
    expect(within(projects).getByText("by icon")).toBeInTheDocument();
    for (const name of ["Web", "Addons", "Engines", "Tools"]) expect(within(projects).getByRole("option", { name })).toBeInTheDocument();
  });

  it("opens Jelly HD from its icon, holding Projects, Readme, Terminal, Lab, Contact and Control Panel", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Jelly HD" }));
    const hd = await win("Jelly HD");
    expect(within(hd).getAllByRole("option").map((option) => option.textContent)).toEqual(["Projects", "Readme", "Terminal", "Lab", "Contact", "Control Panel"]);
  });

  it("opens the Lab from its icon and from Jelly HD, one window for both", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Lab" }));
    const lab = await win("Lab");
    expect(await within(lab).findByRole("textbox", { name: "Program" }, { timeout: 4000 })).toBeInTheDocument();
    expect(Object.values(useWindows.getState().windows).filter((window) => window.app === "lab")).toHaveLength(1);

    await userEvent.dblClick(screen.getByRole("option", { name: "Jelly HD" }));
    await userEvent.dblClick(within(await win("Jelly HD")).getByRole("option", { name: "Lab" }));
    expect(Object.values(useWindows.getState().windows).filter((window) => window.app === "lab")).toHaveLength(1);
  }, 15_000);

  it("opens an empty Trash", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Trash" }));
    const trash = await win("Trash");
    expect(within(trash).getByText("0 items")).toBeInTheDocument();
    expect(within(trash).getByText("No items")).toBeInTheDocument();
  });
});

describe("folder windows", () => {
  it("a folder opens the folder it names, and a project opens its Info window", async () => {
    const opened: string[] = [];
    render(<Desktop onOpenPage={(path) => opened.push(path)} />);
    await userEvent.dblClick(await screen.findByRole("option", { name: "Web" }));
    const web = await win("Web");
    expect(within(web).getByRole("option", { name: /Hundo/ })).toBeInTheDocument();
    await userEvent.dblClick(within(web).getByRole("option", { name: /Hundo/ }));
    expect(await win("Hundo Info")).toBeInTheDocument();
    expect(opened).toEqual(["/projects/hundo"]);
  });

  it("every project sits in its folder", async () => {
    render(<Desktop />);
    for (const [folder, name] of [["tools", "Tools"], ["addons", "Addons"], ["engines", "Engines"]] as const) {
      act(() => void openFolder(folder));
      const items = within(await win(name)).getAllByRole("option");
      expect(items.length).toBeGreaterThan(0);
    }
  });

  it("shows its items by name when its view says so", async () => {
    render(<Desktop />);
    const projects = await win("Projects");
    act(() => useFolderViews.getState().setView(ids.folder("projects"), "name"));
    expect(within(projects).getByText("by name")).toBeInTheDocument();
    expect(within(projects).getAllByRole("option").map((option) => option.textContent)).toEqual(["AddonsFolder", "EnginesFolder", "ToolsFolder", "WebFolder"]);
  });

  it("takes the focus to its first item when it opens, so the arrows and Enter work at once", async () => {
    render(<Desktop />);
    const projects = await win("Projects");
    await waitFor(() => expect(within(projects).getByRole("option", { name: "Web" })).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    const web = await win("Web");
    await waitFor(() => expect(within(web).getAllByRole("option")[0]).toHaveFocus());
  });

  it("moves between items with the arrows and opens with Enter", async () => {
    render(<Desktop />);
    const projects = await win("Projects");
    within(projects).getByRole("option", { name: "Web" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(within(projects).getByRole("option", { name: "Addons" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(await win("Addons")).toBeInTheDocument();
  });
});

describe("the Info window", () => {
  it("lists Stack, Link, Source and Screenshots and opens the README by its default button", async () => {
    render(<Desktop route={projectPage("hundo")} />);
    const info = await win("Hundo Info");
    for (const label of ["Stack", "Link", "Source", "Screenshots"]) expect(within(info).getByText(label)).toBeInTheDocument();
    expect(within(info).getByRole("link", { name: "hundo.quest" })).toHaveAttribute("target", "_blank");
    // The README's first read suspends on its chunk (see settle).
    await settle(() => fireEvent.click(within(info).getByRole("button", { name: "Open Readme" })));
    const readme = await win("Hundo Readme");
    expect(await within(readme).findByRole("heading", { name: "Hundo" })).toBeInTheDocument();
  });

  it("answers Enter with Open Readme", async () => {
    render(<Desktop route={projectPage("hundo")} />);
    await win("Hundo Info");
    await userEvent.keyboard("{Enter}");
    expect(await win("Hundo Readme")).toBeInTheDocument();
  });

  it("shows an unknown link as a dash and gives a project with no pictures no Screenshots row", async () => {
    render(<Desktop route={projectPage("harness")} />);
    const info = await win("harness Info");
    expect(within(info).queryByText("Screenshots")).toBeNull();
    expect(within(info).getByText("Link").nextElementSibling).toHaveTextContent("-");
  });

  it("opens the screenshot viewer from View", async () => {
    render(<Desktop route={projectPage("hundo")} />);
    const info = await win("Hundo Info");
    await userEvent.click(within(info).getByRole("button", { name: "View" }));
    const viewer = await win("Hundo Screenshots");
    expect(within(viewer).getByText("1 of 3")).toBeInTheDocument();
  });
});

describe("the README window", () => {
  it("scrolls, takes the focus, and closes with Esc", async () => {
    render(<Desktop route={projectPage("hundo")} />);
    const open = within(await win("Hundo Info")).getByRole("button", { name: "Open Readme" });
    await settle(() => fireEvent.click(open));
    const readme = await win("Hundo Readme");
    await within(readme).findByRole("heading", { name: "Hundo" });
    await waitFor(() => expect(readme.querySelector(".app-doc")).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    expect(titles()).not.toContain("Hundo Readme");
  });

  it("opens a linked project's Info window", async () => {
    render(<Desktop route={projectPage("hundo")} />);
    const open = within(await win("Hundo Info")).getByRole("button", { name: "Open Readme" });
    await settle(() => fireEvent.click(open));
    const readme = await win("Hundo Readme");
    await within(readme).findByRole("heading", { name: "Hundo" });
    await userEvent.click(within(readme).getByRole("link", { name: "harness" }));
    expect(await win("harness Info")).toBeInTheDocument();
  });
});

describe("the studio's Readme", () => {
  it("carries the address as a link", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Readme" }));
    const readme = await win("Readme");
    expect(within(readme).getByRole("link", { name: "max@jellycat.fr" })).toHaveAttribute("href", "mailto:max@jellycat.fr");
    expect(within(readme).getByText("Jellycat Studio")).toBeInTheDocument();
  });
});

describe("the Control Panel", () => {
  it("sets the phosphor with its radios and the effects with its checkboxes", async () => {
    render(<Desktop />);
    act(() => void useWindows.getState().open({ app: "panel", title: "Control Panel", size: { w: 400, h: 196 } }));
    const panel = await win("Control Panel");
    expect(within(panel).getByRole("radio", { name: "Green" })).toBeChecked();
    await userEvent.click(within(panel).getByRole("radio", { name: "Amber" }));
    expect(useSettings.getState().phosphor).toBe("amber");
    expect(within(panel).getByRole("radio", { name: "Amber" })).toBeChecked();
    for (const [name, key] of [["Scanlines", "scanlines"], ["Glow", "glow"], ["Dither pattern", "dither"]] as const) {
      await userEvent.click(within(panel).getByRole("checkbox", { name }));
      expect(useSettings.getState()[key]).toBe(false);
    }
    await userEvent.click(within(panel).getByRole("checkbox", { name: "Flicker" }));
    expect(useSettings.getState().flicker).toBe(true);
  });

  it("has a Sound row with one checkbox, off, that the settings store keeps", async () => {
    render(<Desktop />);
    act(() => void useWindows.getState().open({ app: "panel", title: "Control Panel", size: { w: 400, h: 196 } }));
    const panel = await win("Control Panel");
    expect(within(panel).getByRole("group", { name: "Sound" })).toBeInTheDocument();
    const on = within(panel).getByRole("checkbox", { name: "On" });
    expect(on).not.toBeChecked();
    await userEvent.click(on);
    expect(useSettings.getState().sound).toBe(true);
    expect(on).toBeChecked();
  });

  it("opens from Jelly HD", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Jelly HD" }));
    await userEvent.dblClick(within(await win("Jelly HD")).getByRole("option", { name: "Control Panel" }));
    expect(await win("Control Panel")).toBeInTheDocument();
  });
});

describe("the Terminal", () => {
  const type = async (terminal: HTMLElement, line: string) => {
    await userEvent.type(within(terminal).getByLabelText("Terminal input"), `${line}{Enter}`);
  };

  it("runs ls", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Terminal" }));
    const terminal = await win("Terminal");
    await type(terminal, "ls");
    expect(await within(terminal).findByRole("button", { name: /^projects/ })).toBeInTheDocument();
  });

  it("opens a project's README window with less", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Terminal" }));
    const terminal = await win("Terminal");
    await type(terminal, "less ~/projects/web/hundo/README");
    expect(await win("Hundo Readme")).toBeInTheDocument();
    expect(within(terminal).getByText("opened Hundo Readme")).toBeInTheDocument();
  });

  it("opens a project's Screenshots window with view", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Terminal" }));
    const terminal = await win("Terminal");
    await type(terminal, "view hundo");
    expect(await win("Hundo Screenshots")).toBeInTheDocument();
    expect(within(terminal).getByText("opened Hundo Screenshots")).toBeInTheDocument();
  });

  it("prints any other file", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Terminal" }));
    const terminal = await win("Terminal");
    await type(terminal, "less ~/contact.txt");
    expect(await within(terminal).findAllByText(/max@jellycat\.fr/)).not.toHaveLength(0);
    expect(titles()).not.toContain("Jellycat Studio Readme");
  });

  it("opens a project's Info window with open", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Terminal" }));
    await type(await win("Terminal"), "open hundo");
    expect(await win("Hundo Info")).toBeInTheDocument();
  });
});

describe("the address", () => {
  it("opens the Info window over Projects for a deep link", async () => {
    render(<Desktop route={projectPage("hundo")} />);
    expect(await win("Projects")).toBeInTheDocument();
    const info = await win("Hundo Info");
    expect(info).toHaveAttribute("data-active");
    expect(info.style.zIndex > (await win("Projects")).style.zIndex).toBe(true);
  });

  it("closes the Info window when the address goes back to the desktop, and opens it again going forward", async () => {
    const { rerender } = render(<Desktop route={projectPage("hundo")} />);
    await win("Hundo Info");
    rerender(<Desktop />);
    await waitFor(() => expect(titles()).not.toContain("Hundo Info"));
    expect(titles()).toContain("Projects");
    rerender(<Desktop route={projectPage("hundo")} />);
    expect(await win("Hundo Info")).toBeInTheDocument();
  });

  it("tells the host when the Info window it names is closed", async () => {
    const closed: string[] = [];
    render(<Desktop route={projectPage("hundo")} onClosePage={(id) => closed.push(id)} />);
    await userEvent.click(within(await win("Hundo Info")).getByRole("button", { name: "Close" }));
    expect(closed).toEqual([ids.info("hundo")]);
  });

  it("takes the address back when the window an open is waiting on is closed before the address arrives", async () => {
    const closed: string[] = [];
    render(<Desktop onOpenPage={() => {}} onClosePage={(id) => closed.push(id)} />);
    await userEvent.dblClick(await screen.findByRole("option", { name: "Web" }));
    await userEvent.dblClick(within(await win("Web")).getByRole("option", { name: /Hundo/ }));
    await userEvent.click(within(await win("Hundo Info")).getByRole("button", { name: "Close" }));
    expect(closed).toEqual([ids.info("hundo")]);
  });

  it("keeps one Info window as the address walks between projects", async () => {
    const { rerender } = render(<Desktop route={projectPage("hundo")} />);
    await win("Hundo Info");
    rerender(<Desktop route={projectPage("farseer")} />);
    await win("Farseer Info");
    expect(titles()).not.toContain("Hundo Info");
    rerender(<Desktop route={projectPage("hundo")} />);
    await win("Hundo Info");
    expect(titles()).not.toContain("Farseer Info");
    rerender(<Desktop />);
    await waitFor(() => expect(titles().filter((title) => title.endsWith("Info"))).toEqual([]));
  });

  it("closes only Info windows on a move: any other window stays open", async () => {
    const { rerender } = render(<Desktop route={projectPage("hundo")} />);
    await win("Hundo Info");
    await userEvent.dblClick(screen.getByRole("option", { name: "Terminal" }));
    await win("Terminal");
    rerender(<Desktop route={projectPage("farseer")} />);
    await win("Farseer Info");
    rerender(<Desktop />);
    await waitFor(() => expect(titles()).not.toContain("Farseer Info"));
    expect(titles()).toEqual(expect.arrayContaining(["Projects", "Terminal"]));
  });

  it("does not tell it of a window the address no longer names", async () => {
    const closed: string[] = [];
    const { rerender } = render(<Desktop route={projectPage("hundo")} onClosePage={(id) => closed.push(id)} />);
    await win("Hundo Info");
    rerender(<Desktop onClosePage={(id) => closed.push(id)} />);
    await waitFor(() => expect(titles()).not.toContain("Hundo Info"));
    expect(closed).toEqual([]);
  });

  it("tells the host which project an icon opened", async () => {
    const opened: string[] = [];
    render(<Desktop onOpenPage={(path) => opened.push(path)} />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Terminal" }));
    await userEvent.type(within(await win("Terminal")).getByLabelText("Terminal input"), "open hundo{Enter}");
    await waitFor(() => expect(opened).toEqual(["/projects/hundo"]));
  });
});

describe("the Contact window", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("opens from its icon with the focus in Name, and leaves the address where it is", async () => {
    const opened: string[] = [];
    render(<Desktop onOpenPage={(path) => opened.push(path)} />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Contact" }));
    const contact = await win("Contact");
    expect(within(contact).getByText("To").nextElementSibling).toHaveTextContent("max@jellycat.fr");
    await waitFor(() => expect(within(contact).getByLabelText("Name")).toHaveFocus());
    expect(opened).toEqual([]);
  });

  it("opens from Jelly HD, and a second open brings the same window forward", async () => {
    render(<Desktop />);
    await userEvent.dblClick(screen.getByRole("option", { name: "Jelly HD" }));
    await userEvent.dblClick(within(await win("Jelly HD")).getByRole("option", { name: "Contact" }));
    await win("Contact");
    await userEvent.dblClick(within(await win("Jelly HD")).getByRole("option", { name: "Contact" }));
    expect(titles().filter((title) => title === "Contact")).toHaveLength(1);
  });

  it("opens over Projects for the /contact address, and tells the host when it is closed", async () => {
    const closed: string[] = [];
    render(<Desktop route={contactPage} onClosePage={(id) => closed.push(id)} />);
    expect(await win("Projects")).toBeInTheDocument();
    const contact = await win("Contact");
    expect(contact).toHaveAttribute("data-active");
    await userEvent.click(within(contact).getByRole("button", { name: "Close" }));
    expect(closed).toEqual([ids.contact]);
  });

  it("stays open, with what was typed, when the address moves to a project and back", async () => {
    const { rerender } = render(<Desktop route={contactPage} />);
    await userEvent.type(within(await win("Contact")).getByLabelText("Message"), "Half a message");
    rerender(<Desktop route={projectPage("hundo")} />);
    await win("Hundo Info");
    expect(within(await win("Contact")).getByLabelText("Message")).toHaveValue("Half a message");
    rerender(<Desktop />);
    await waitFor(() => expect(titles()).not.toContain("Hundo Info"));
    expect(within(await win("Contact")).getByLabelText("Message")).toHaveValue("Half a message");
  });
});
