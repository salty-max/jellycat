import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DesktopSurface } from "./surface";

const option = (name: string) => screen.getByRole("option", { name });

test("a click selects, and a second click opens", async () => {
  const onOpen = vi.fn();
  render(<DesktopSurface onOpen={onOpen} />);
  await userEvent.click(option("Projects"));
  expect(option("Projects")).toHaveAttribute("aria-selected", "true");
  expect(onOpen).not.toHaveBeenCalled();
  await userEvent.click(option("Projects"));
  expect(onOpen).toHaveBeenCalledExactlyOnceWith("projects");
});

test("a double click opens once", async () => {
  const onOpen = vi.fn();
  render(<DesktopSurface onOpen={onOpen} />);
  await userEvent.dblClick(option("Readme"));
  expect(onOpen).toHaveBeenCalledExactlyOnceWith("readme");
});

test("a double click on an icon that is already selected opens it once", async () => {
  const onOpen = vi.fn();
  render(<DesktopSurface onOpen={onOpen} />);
  await userEvent.click(option("Readme"));
  await userEvent.dblClick(option("Readme"));
  expect(onOpen).toHaveBeenCalledOnce();
});

test("a held Enter opens once", async () => {
  const onOpen = vi.fn();
  render(<DesktopSurface onOpen={onOpen} />);
  await userEvent.tab();
  await userEvent.keyboard("{Enter>3/}");
  expect(onOpen).toHaveBeenCalledOnce();
});

test("Enter opens the focused icon", async () => {
  const onOpen = vi.fn();
  render(<DesktopSurface onOpen={onOpen} />);
  await userEvent.tab();
  await userEvent.keyboard("{Enter}");
  expect(onOpen).toHaveBeenCalledExactlyOnceWith("hd");
});

test("the arrows move between icons, and stop at the ends", async () => {
  render(<DesktopSurface onOpen={() => {}} />);
  await userEvent.tab();
  await userEvent.keyboard("{ArrowUp}");
  expect(option("Jelly HD")).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}{ArrowDown}");
  expect(option("Readme")).toHaveFocus();
  expect(option("Readme")).toHaveAttribute("aria-selected", "true");
  expect(option("Projects")).toHaveAttribute("aria-selected", "false");
  await userEvent.keyboard("{End}{ArrowDown}");
  expect(option("Trash")).toHaveFocus();
});

test("only one icon is a tab stop", () => {
  render(<DesktopSurface onOpen={() => {}} />);
  expect(screen.getAllByRole("option").filter((o) => o.tabIndex === 0)).toHaveLength(1);
});

test("a click on the bare desktop deselects", async () => {
  const { container } = render(<DesktopSurface onOpen={() => {}} />);
  await userEvent.click(option("Terminal"));
  await userEvent.click(container.firstElementChild!);
  expect(screen.queryByRole("option", { selected: true })).toBeNull();
});

test("a selected icon is inverted", async () => {
  render(<DesktopSurface onOpen={() => {}} />);
  await userEvent.click(option("Trash"));
  expect(option("Trash").querySelector("span")).toHaveClass("inverse");
  expect(option("Jelly HD").querySelector("span")).not.toHaveClass("inverse");
});
