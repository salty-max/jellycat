import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useSettings } from "../../../core/settings";
import { useFolderViews } from "../apps/folder-view";
import { DesktopContext } from "../apps/context";
import { openControlPanel, openFolder, openInfo } from "../apps/launch";
import { MenuBar } from "../surface/menu-bar";
import { useWindows } from "../windows/store";
import { SystemMenus } from "./menus";
import { useSelection } from "./selection";

function Bar(props: { onRestart?: () => void; onShutDown?: () => void }) {
  return (
    <DesktopContext.Provider value={{ openProject: openInfo }}>
      <MenuBar>
        <SystemMenus {...props} />
      </MenuBar>
    </DesktopContext.Provider>
  );
}

const item = (name: string) => screen.getByRole("menuitem", { name });

describe("the menu bar", () => {
  it("has the cat menu and the five menus, in the mockup's order", () => {
    render(<Bar />);
    const triggers = screen.getAllByRole("menuitem").map((each) => each.textContent || each.getAttribute("aria-label"));
    expect(triggers).toEqual(["Jelly-OS", "File", "Edit", "View", "Special", "Window"]);
  });

  it("the cat menu holds About and Control Panel; Control Panel opens its window", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "Jelly-OS" }));
    expect(await screen.findByRole("menuitem", { name: "About Jelly-OS" })).toBeInTheDocument();
    await user.click(item("Control Panel"));
    expect(useWindows.getState().windows.panel).toBeDefined();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("About names the OS and the studio; OK closes it", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "Jelly-OS" }));
    await user.click(await screen.findByRole("menuitem", { name: "About Jelly-OS" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Jelly-OS 1.0" }, { timeout: 3000 });
    expect(dialog).toHaveTextContent("Jellycat Studio");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("the keyboard: arrows across, down into a menu, Enter selects, Esc closes", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    screen.getByRole("menuitem", { name: "File" }).focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("menuitem", { name: "Special" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(await screen.findByRole("menuitemradio", { name: "Green phosphor" })).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(useSettings.getState().phosphor).toBe("amber");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

    await user.keyboard("{ArrowDown}");
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("File: Open, Get Info and Close Window are dim with nothing to act on, and act on the selection and the front window", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "File" }));
    for (const name of ["Open", "Get Info", "Close Window"])
      expect(await screen.findByRole("menuitem", { name })).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Escape}");

    useWindows.getState().open({ app: "x", title: "Front", size: { w: 300, h: 200 } });
    useSelection.getState().report("desktop", "projects");
    await user.click(screen.getByRole("menuitem", { name: "File" }));
    expect(await screen.findByRole("menuitem", { name: "Open" })).not.toHaveAttribute("aria-disabled", "true");
    expect(item("Get Info")).toHaveAttribute("aria-disabled", "true");
    await user.click(item("Open"));
    expect(useWindows.getState().windows["folder:projects"]).toBeDefined();

    await user.click(screen.getByRole("menuitem", { name: "File" }));
    await user.click(await screen.findByRole("menuitem", { name: "Close Window" }));
    expect(useWindows.getState().windows["folder:projects"]).toBeUndefined();
  });

  it("Get Info is live for a project selected in a folder window", async () => {
    const user = userEvent.setup();
    openFolder("web");
    useSelection.getState().report("folder:web", "hundo");
    render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "File" }));
    await user.click(await screen.findByRole("menuitem", { name: "Get Info" }));
    expect(useWindows.getState().windows["info:hundo"]).toBeDefined();
  });

  it("Edit is dim", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    for (const name of ["Undo", "Cut", "Copy", "Paste"])
      expect(await screen.findByRole("menuitem", { name })).toHaveAttribute("aria-disabled", "true");
  });

  it("View: dim unless a folder window is in front; it sets that window's view and shows the current one checked", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "View" }));
    expect(await screen.findByRole("menuitemradio", { name: "by Icon" })).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Escape}");

    openFolder("projects");
    rerender(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "View" }));
    expect(await screen.findByRole("menuitemradio", { name: "by Icon" })).toBeChecked();
    await user.click(screen.getByRole("menuitemradio", { name: "by Name" }));
    expect(useFolderViews.getState().views["folder:projects"]).toBe("name");
    await user.click(screen.getByRole("menuitem", { name: "View" }));
    expect(await screen.findByRole("menuitemradio", { name: "by Name" })).toBeChecked();
  });

  it("Special: the phosphors, the effects as one switch, the dither", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    expect(await screen.findByRole("menuitemradio", { name: "Green phosphor" })).toBeChecked();
    await user.click(screen.getByRole("menuitemradio", { name: "White phosphor" }));
    expect(useSettings.getState().phosphor).toBe("white");

    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    expect(await screen.findByRole("menuitemcheckbox", { name: "CRT effects" })).toBeChecked();
    await user.click(screen.getByRole("menuitemcheckbox", { name: "CRT effects" }));
    expect(useSettings.getState()).toMatchObject({ scanlines: false, glow: false, flicker: false });
    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "CRT effects" }));
    expect(useSettings.getState()).toMatchObject({ scanlines: true, glow: true, flicker: false });

    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Dither pattern" }));
    expect(useSettings.getState().dither).toBe(false);
  });

  it("Restart closes every window and tells the host", async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    openFolder("projects");
    render(<Bar onRestart={onRestart} />);
    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    await user.click(await screen.findByRole("menuitem", { name: "Restart" }));
    expect(onRestart).toHaveBeenCalledOnce();
    expect(useWindows.getState().windows).toEqual({});
    expect(useWindows.getState().opened).toBe(0);
  });

  it("Shut Down... asks first: Cancel keeps everything, Shut Down closes the windows and tells the host", async () => {
    const user = userEvent.setup();
    const onShutDown = vi.fn();
    openFolder("projects");
    render(<Bar onShutDown={onShutDown} />);
    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    await user.click(await screen.findByRole("menuitem", { name: "Shut Down..." }));
    expect(await screen.findByRole("alertdialog", { name: "Shut down Jelly-OS?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onShutDown).not.toHaveBeenCalled();
    expect(useWindows.getState().windows["folder:projects"]).toBeDefined();

    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    await user.click(await screen.findByRole("menuitem", { name: "Shut Down..." }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Enter}");
    expect(onShutDown).toHaveBeenCalledOnce();
    expect(useWindows.getState().windows).toEqual({});
  });

  it("Window lists the open windows with the front one checked, and picking one brings it forward", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "Window" }));
    expect(await screen.findByRole("menuitem", { name: "No windows" })).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Escape}");

    openFolder("projects");
    openControlPanel();
    await user.click(screen.getByRole("menuitem", { name: "Window" }));
    expect(await screen.findByRole("menuitemradio", { name: "Control Panel" })).toBeChecked();
    expect(screen.getByRole("menuitemradio", { name: "Projects" })).not.toBeChecked();
    await user.click(screen.getByRole("menuitemradio", { name: "Projects" }));
    expect(useWindows.getState().order.at(-1)).toBe("folder:projects");
  });
});
