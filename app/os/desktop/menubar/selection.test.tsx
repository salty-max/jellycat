import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DesktopSurface } from "../surface/surface";
import { useSelection } from "./selection";

test("the surface holds the selection until another owner takes it, then drops its highlight", async () => {
  render(<DesktopSurface onOpen={() => {}} />);
  await userEvent.click(screen.getByRole("option", { name: "Projects" }));
  expect(useSelection.getState().selected).toEqual({ owner: "desktop", key: "projects" });

  act(() => useSelection.getState().report("folder:web", "hundo"));
  expect(screen.getByRole("option", { name: "Projects" })).toHaveAttribute("aria-selected", "false");

  // Closing the other owner's window clears the store; the icon is picked again with a click.
  act(() => useSelection.getState().report("folder:web", null));
  expect(useSelection.getState().selected).toBeNull();
  await userEvent.click(screen.getByRole("option", { name: "Projects" }));
  expect(useSelection.getState().selected).toEqual({ owner: "desktop", key: "projects" });
});
