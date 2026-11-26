import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettings } from "../../core/settings";
import { ControlPanelSheet } from "../phone/control-panel-sheet";
import { cancelDialog, stubDialog } from "../phone/test-dialog";
import { DesktopContext } from "../desktop/apps/context";
import { openFolder, openInfo } from "../desktop/apps/launch";
import { SystemMenus } from "../desktop/menubar/menus";
import { MenuBar } from "../desktop/surface/menu-bar";
import { useWindows } from "../desktop/windows/store";
import { WindowLayer } from "../desktop/windows/window-layer";
import type { Cue } from "./cues";

// Where each cue is asked for. The sound itself is sound.test.tsx's; here `playCue` is a spy.
const played = vi.hoisted(() => vi.fn<(cue: Cue) => void>());
const gesture = vi.hoisted(() => vi.fn(() => true));
vi.mock("./sound", async (importOriginal) => ({ ...(await importOriginal<typeof import("./sound")>()), playCue: played, recentGesture: gesture }));

beforeEach(() => {
  played.mockClear();
  gesture.mockReturnValue(true);
});

const cues = () => played.mock.calls.map(([cue]) => cue);

describe("the desktop's windows", () => {
  const Note = () => <p>note</p>;
  const registry = { note: Note };
  const open = (id: string) => act(() => void useWindows.getState().open({ id, app: "note", title: id, size: { w: 200, h: 100 } }));
  beforeEach(() => {
    render(<WindowLayer registry={registry} />);
  });

  it("a high click when a window opens, a lower one when one closes, none for the first window the desktop opens by itself", () => {
    open("boot");
    expect(cues()).toEqual([]);
    open("a");
    expect(cues()).toEqual(["open"]);
    act(() => useWindows.getState().close("a"));
    expect(cues()).toEqual(["open", "close"]);
  });

  it("goes silent when it is unmounted with no click or key behind it (a phone turned wide), but not when Esc or Android's back closes it", async () => {
    stubDialog();
    gesture.mockReturnValue(false);
    const swapped = render(<ControlPanelSheet onClose={() => {}} />);
    swapped.unmount();
    expect(cues()).toEqual(["open"]);

    played.mockClear();
    function Host() {
      const [open, setOpen] = useState(true);
      return open ? <ControlPanelSheet onClose={() => setOpen(false)} /> : null;
    }
    render(<Host />);
    await cancelDialog(screen.getByRole("dialog", { name: "Control Panel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(cues()).toEqual(["open", "close"]);
  });

  it("a window that opens or closes with no click or key a moment before it (Back between two projects) is silent", () => {
    open("boot");
    open("a");
    played.mockClear();
    gesture.mockReturnValue(false);
    open("b");
    act(() => useWindows.getState().close("a"));
    expect(cues()).toEqual([]);
  });

  it("opening a window that is already open, focusing and moving one make no sound", () => {
    open("boot");
    open("a");
    played.mockClear();
    open("a");
    act(() => useWindows.getState().focus("boot"));
    act(() => useWindows.getState().moveBy("a", 5, 5));
    act(() => useWindows.getState().toggleZoom("a"));
    expect(cues()).toEqual([]);
  });

  it("clearing every window (Restart, Shut Down) is silent: they have their own tone", () => {
    open("boot");
    open("a");
    played.mockClear();
    act(() => useWindows.setState({ ...useWindows.getInitialState() }, true));
    expect(cues()).toEqual([]);
  });
});

describe("the menus", () => {
  function Bar(props: { onRestart?: () => void; onShutDown?: () => void }) {
    return (
      <DesktopContext.Provider value={{ openProject: openInfo }}>
        <MenuBar>
          <SystemMenus {...props} />
        </MenuBar>
      </DesktopContext.Provider>
    );
  }

  it("About and Shut Down... beep as they appear; Cancel is silent", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "Jelly-OS" }));
    await user.click(await screen.findByRole("menuitem", { name: "About Jelly-OS" }));
    await screen.findByRole("alertdialog", {}, { timeout: 3000 });
    expect(cues()).toEqual(["alert"]);
    await user.click(screen.getByRole("button", { name: "OK" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(cues()).toEqual(["alert"]);
  });

  it("Restart rises and Shut Down falls, each once", async () => {
    const user = userEvent.setup();
    openFolder("projects");
    render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    await user.click(await screen.findByRole("menuitem", { name: "Restart" }));
    expect(cues()).toEqual(["up"]);
    played.mockClear();
    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    await user.click(await screen.findByRole("menuitem", { name: "Shut Down..." }));
    await screen.findByRole("alertdialog");
    await waitFor(() => expect(screen.getByRole("button", { name: "Shut Down" })).toHaveFocus());
    await user.keyboard("{Enter}");
    expect(cues()).toEqual(["alert", "down"]);
  });

  it("Special's Sound item is checked with the setting and flips it", async () => {
    const user = userEvent.setup();
    render(<Bar />);
    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    const item = await screen.findByRole("menuitemcheckbox", { name: "Sound" });
    expect(item).not.toBeChecked();
    await user.click(item);
    expect(useSettings.getState().sound).toBe(true);
    await user.click(screen.getByRole("menuitem", { name: "Special" }));
    expect(await screen.findByRole("menuitemcheckbox", { name: "Sound" })).toBeChecked();
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Sound" }));
    expect(useSettings.getState().sound).toBe(false);
  });
});

describe("the phone's dialogs", () => {
  it("a click as the sheet or the viewer opens and a lower one as it closes", () => {
    stubDialog();
    const view = render(<ControlPanelSheet onClose={() => {}} />);
    expect(cues()).toEqual(["open"]);
    view.unmount();
    expect(cues()).toEqual(["open", "close"]);
  });
});
