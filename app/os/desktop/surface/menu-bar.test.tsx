import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { formatClock } from "./format-clock";
import { Clock, MenuBar } from "./menu-bar";

test("the clock reads HH:MM", () => {
  expect(formatClock(new Date(2026, 0, 2, 3, 4))).toBe("03:04");
});

test("the prerendered clock is empty: the time is drawn on the client", () => {
  expect(renderToString(<MenuBar now={() => new Date(2026, 0, 2, 3, 4)} />)).not.toContain("03:04");
});

afterEach(() => vi.useRealTimers());

test("the clock fills in after mount and ticks", () => {
  vi.useFakeTimers();
  let now = new Date(2026, 0, 2, 3, 4);
  render(<Clock now={() => now} />);
  expect(document.querySelector("time")).toHaveTextContent("03:04");
  now = new Date(2026, 0, 2, 3, 5);
  act(() => void vi.advanceTimersByTime(1000));
  expect(document.querySelector("time")).toHaveTextContent("03:05");
});

test("the slot holds what it is given", () => {
  render(<MenuBar>File</MenuBar>);
  expect(screen.getByText("File")).toBeInTheDocument();
});
