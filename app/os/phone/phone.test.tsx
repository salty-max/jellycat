import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { FOLDERS, FOLDER_NAMES, PROJECTS, projectBySlug } from "../../core/projects";
import type { Block } from "../../core/readme";
import { CONTACT_EMAIL, GITHUB_URL } from "../../core/studio";
import { Picture } from "../viewer/picture";
import { PhoneCrt } from "./crt";
import { PhoneFooter } from "./footer";
import { PhoneHeader } from "./header";
import { PhoneHome } from "./home";
import { PhonePage } from "./page";
import { PhoneProject } from "./project";
import { STUDIO_LINE } from "./text";

const Where = () => {
  const { pathname, hash } = useLocation();
  return <output aria-label="where">{pathname + hash}</output>;
};
const inRouter = (ui: React.ReactNode, at = "/") =>
  render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="*" element={ui} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
const where = () => screen.getByLabelText("where").textContent;

const hundo = projectBySlug("hundo")!;
const keyring = projectBySlug("keyring")!;
const blocks: Block[] = [
  { kind: "title", text: "Hundo" },
  { kind: "heading", text: "Built with" },
  {
    kind: "paragraph",
    content: [
      { kind: "text", text: "Next to " },
      { kind: "project", text: "Farseer", slug: "farseer" },
      { kind: "text", text: ", at " },
      { kind: "link", text: "the site", href: "https://hundo.quest" },
      { kind: "text", text: " with " },
      { kind: "code", text: "pnpm check" },
    ],
  },
  { kind: "list", items: [[{ kind: "text", text: "one" }], [{ kind: "text", text: "two" }]] },
];

describe("the header", () => {
  it("has the cat and the studio's name as a link home, and the Control Panel as a named button", async () => {
    const onOpenPanel = vi.fn();
    inRouter(<PhoneHeader onOpenPanel={onOpenPanel} />);
    expect(screen.getByRole("link", { name: "Jellycat Studio" })).toHaveAttribute("href", "/");
    const button = screen.getByRole("button", { name: "Control Panel" });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(button);
    // The button itself goes with it, so the sheet gives the focus back to it (iOS doesn't focus a tapped button).
    expect(onOpenPanel).toHaveBeenCalledExactlyOnceWith(button);
  });

  it("says when its sheet is open", () => {
    inRouter(<PhoneHeader onOpenPanel={() => {}} panelOpen />);
    expect(screen.getByRole("button", { name: "Control Panel" })).toHaveAttribute("aria-expanded", "true");
  });

  it("has icons that screen readers skip", () => {
    const { container } = inRouter(<PhoneHeader onOpenPanel={() => {}} />);
    expect([...container.querySelectorAll("svg")].every((svg) => svg.getAttribute("aria-hidden") === "true")).toBe(true);
  });
});

describe("the home page", () => {
  it("has one h1, the studio's line and the contact's two rows", () => {
    inRouter(<PhoneHome />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Jellycat Studio");
    expect(STUDIO_LINE).toBe("Web apps, World of Warcraft addons, engines and tools.");
    expect(screen.getByText(STUDIO_LINE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
    expect(screen.getByRole("link", { name: "github.com/salty-max" })).toHaveAttribute("href", GITHUB_URL);
  });

  it("has a tab for each folder with its count, and one section and bar for each", () => {
    inRouter(<PhoneHome />);
    const tabs = within(screen.getByRole("navigation", { name: "Folders" }));
    for (const folder of FOLDERS) {
      const count = PROJECTS.filter((project) => project.folder === folder).length;
      expect(tabs.getByRole("link", { name: `${FOLDER_NAMES[folder]} ${count}` })).toHaveAttribute("href", `/#${folder}`);
      const section = screen.getByRole("region", { name: new RegExp(`^${FOLDER_NAMES[folder]}`) });
      expect(section).toHaveAttribute("id", folder);
      expect(within(section).getAllByRole("listitem")).toHaveLength(count);
    }
    expect(screen.getByRole("heading", { level: 2, name: /^Engines.*1 item$/ })).toBeInTheDocument();
  });

  it("has a card for every project, in the data's order, one link each named by the project alone", () => {
    inRouter(<PhoneHome />);
    const links = FOLDERS.flatMap((folder) => PROJECTS.filter((project) => project.folder === folder)).map((project) =>
      screen.getByRole("link", { name: project.name }),
    );
    for (const link of links) expect(link).toHaveAttribute("href", expect.stringMatching(/^\/projects\//));
    const card = screen.getByRole("link", { name: "Hundo" }).closest("li")!;
    expect(within(card).getByText(hundo.kind)).toBeInTheDocument();
    expect(within(card).getByText(hundo.description)).toBeInTheDocument();
    expect(within(card).getByText("3 pictures")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: keyring.name }).closest("li")!).queryByText(/picture/)).toBeNull();
  });

  it("moves to a project's page by its card", async () => {
    inRouter(<PhoneHome />);
    await userEvent.click(screen.getByRole("link", { name: "Hundo" }));
    expect(where()).toBe("/projects/hundo");
  });

  it("puts the tab's folder in the address", async () => {
    inRouter(<PhoneHome />);
    await userEvent.click(screen.getByRole("link", { name: "Addons 11" }));
    expect(where()).toBe("/#addons");
  });
});

describe("a project's page", () => {
  const page = (project = hundo, given: readonly Block[] | null = blocks, onOpenPicture = vi.fn()) => {
    inRouter(<PhoneProject project={project} blocks={given} onOpenPicture={onOpenPicture} />, `/projects/${project.slug}`);
    return onOpenPicture;
  };

  it("has the name as the h1, the kind, the description and the facts", () => {
    page();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hundo");
    expect(screen.getByText(hundo.kind)).toBeInTheDocument();
    expect(screen.getByText(hundo.description)).toBeInTheDocument();
    expect(screen.getByText(hundo.stack)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "hundo.quest" })).toHaveAttribute("href", hundo.link);
    expect(screen.getByRole("link", { name: "github.com/salty-max/hundo" })).toHaveAttribute("href", hundo.source);
  });

  it("says `-` for an unknown link", () => {
    page(keyring);
    const link = screen.getByText("Link").nextElementSibling;
    expect(link).toHaveTextContent("-");
    expect(link?.querySelector("a")).toBeNull();
  });

  it("links back to its folder on the home page, and to its neighbours", async () => {
    page();
    expect(screen.getByRole("link", { name: "Web" })).toHaveAttribute("href", "/#web");
    const nav = within(screen.getByRole("navigation", { name: "Projects" }));
    expect(nav.queryByRole("link", { name: /Previous/ })).toBeNull();
    await userEvent.click(nav.getByRole("link", { name: /Next/ }));
    expect(where()).toBe(`/projects/${PROJECTS[1].slug}`);
  });

  it("has both neighbours in the middle of the list", () => {
    page(PROJECTS[2]);
    const nav = within(screen.getByRole("navigation", { name: "Projects" }));
    expect(nav.getByRole("link", { name: new RegExp(`Previous.*${PROJECTS[1].name}`) })).toHaveAttribute("href", `/projects/${PROJECTS[1].slug}`);
    expect(nav.getByRole("link", { name: new RegExp(`Next.*${PROJECTS[3].name}`) })).toHaveAttribute("href", `/projects/${PROJECTS[3].slug}`);
  });

  it("stacks the pictures under a heading with the count, the first eager, and tells the host which was pressed", async () => {
    const onOpenPicture = page();
    expect(screen.getByRole("heading", { level: 2, name: /^Screenshots/ })).toHaveTextContent("3 pictures");
    const buttons = screen.getAllByRole("button", { name: /./ });
    expect(buttons).toHaveLength(3);
    const images = hundo.screenshots.map((shot) => screen.getByRole("img", { name: shot.alt }));
    expect(images.map((image) => image.getAttribute("loading"))).toEqual(["eager", "lazy", "lazy"]);
    expect(images[2]).toHaveAttribute("width", String(hundo.screenshots[2].width));
    await userEvent.click(buttons[2]);
    expect(onOpenPicture).toHaveBeenCalledExactlyOnceWith(2, buttons[2]);
  });

  it("has no Screenshots heading for a project with none", () => {
    page(keyring);
    expect(screen.queryByRole("heading", { name: /Screenshots/ })).toBeNull();
  });

  it("draws the README in a labelled pane with its path in the border, the border's text hidden from screen readers", () => {
    page();
    const pane = screen.getByRole("region", { name: "README" });
    const path = within(pane).getByText("~/projects/web/hundo/README");
    expect(path).toHaveAttribute("aria-hidden", "true");
    expect(within(pane).getByRole("heading", { level: 2, name: "Hundo" })).toBeInTheDocument();
    expect(within(pane).getByRole("heading", { level: 3, name: "Built with" })).toBeInTheDocument();
    expect(within(pane).getByRole("link", { name: "the site" })).toHaveAttribute("target", "_blank");
  });

  it("moves to another project's page by a link in its README", async () => {
    page();
    await userEvent.click(screen.getByRole("link", { name: "Farseer" }));
    expect(where()).toBe("/projects/farseer");
  });

  it("leaves a link with a modifier to the browser", () => {
    page();
    // The page's handlers have run by the time the click reaches the document: it is left to the browser if nothing prevented it.
    let prevented: boolean | undefined;
    document.addEventListener("click", (event) => ((prevented = event.defaultPrevented), event.preventDefault()), { once: true });
    fireEvent.click(screen.getByRole("link", { name: "Farseer" }), { ctrlKey: true });
    expect(prevented).toBe(false);
    expect(where()).toBe("/projects/hundo");
  });

  it("says when the README could not be loaded", () => {
    page(hundo, null);
    expect(screen.getByText("README: could not be loaded")).toBeInTheDocument();
  });
});

describe("the page", () => {
  it("is a banner, a main and a contentinfo with the OS's name and version, and the CRT layer over them", () => {
    const { container } = inRouter(
      <PhonePage onOpenPanel={() => {}}>
        <PhoneHome />
      </PhonePage>,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(within(screen.getByRole("contentinfo")).getByText("Jelly-OS 1.0")).toBeInTheDocument();
    const layers = container.querySelectorAll(".ph-crt");
    expect(layers).toHaveLength(2);
    for (const layer of layers) expect(layer).toHaveAttribute("aria-hidden", "true");
  });

  it("has a footer on its own", () => {
    render(<PhoneFooter />);
    expect(screen.getByText("Jelly-OS 1.0")).toBeInTheDocument();
  });

  it("has a CRT layer that is hidden from screen readers and holds no text", () => {
    const { container } = render(<PhoneCrt />);
    expect(container.textContent).toBe("");
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(container.children.length);
    expect(container.querySelector(".crt-overlay")).not.toBeNull();
    expect(container.querySelector(".crt-flicker")).not.toBeNull();
  });
});

describe("Picture's loading", () => {
  it("is lazy unless it says eager", () => {
    const shot = hundo.screenshots[0];
    const { rerender } = render(<Picture shot={shot} />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
    rerender(<Picture shot={shot} loading="eager" />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
  });
});
