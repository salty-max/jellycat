import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { projectBySlug } from "../../core/projects";
import { cancelDialog, stubDialog } from "./test-dialog";
import { PhoneViewer } from "./viewer-dialog";

const hundo = projectBySlug("hundo")!.screenshots;

beforeEach(() => void stubDialog());
// jsdom has no `decode`: a test that defines one lets it go here, even when it fails.
afterEach(() => void Reflect.deleteProperty(HTMLImageElement.prototype, "decode"));

const dialog = () => screen.getByRole("dialog", { name: "Hundo screenshots" });
const previous = () => screen.getByRole("button", { name: "Previous" });
const next = () => screen.getByRole("button", { name: "Next" });

// A project page with a picture to open the viewer from.
function Page({ start = 0, onClosed }: { start?: number; onClosed?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open picture
      </button>
      {open && (
        <PhoneViewer
          slug="hundo"
          start={start}
          onClose={() => {
            setOpen(false);
            onClosed?.();
          }}
        />
      )}
    </>
  );
}

// A finger down at x, up at another point: pointer events as a touch screen sends them.
function swipe(from: [number, number], to: [number, number]) {
  const box = within(dialog()).getByRole("img").closest(".dlg-box")!;
  fireEvent.pointerDown(box, { pointerId: 1, isPrimary: true, button: 0, clientX: from[0], clientY: from[1] });
  fireEvent.pointerUp(box, { pointerId: 1, clientX: to[0], clientY: to[1] });
}

test("it is a modal dialog named for the project, with the name and the count in the pane's border and Close focused", async () => {
  render(<PhoneViewer slug="hundo" start={0} onClose={() => {}} />);
  const viewer = within(dialog());
  expect(viewer.getByText("Hundo")).toBeInTheDocument();
  expect(viewer.getByText("1 of 3")).toHaveAttribute("role", "status");
  // A frame after it opens (dialog.tsx says why).
  await waitFor(() => expect(viewer.getByRole("button", { name: "Close" })).toHaveFocus());
});

test("the picture is whole, in AVIF and WebP with its size, and the alt text is its caption", () => {
  render(<PhoneViewer slug="hundo" start={0} onClose={() => {}} />);
  const img = within(dialog()).getByRole("img", { name: hundo[0].alt });
  expect(img).toHaveAttribute("src", `${hundo[0].src}.webp`);
  expect(img).toHaveAttribute("width", String(hundo[0].width));
  expect(img.previousElementSibling).toHaveAttribute("srcset", `${hundo[0].src}.avif`);
  // The caption is the same words as the picture's name: screen readers get them once.
  expect(within(dialog()).getByText(hundo[0].alt)).toHaveAttribute("aria-hidden", "true");
});

test("it opens on the picture that opened it", () => {
  render(<PhoneViewer slug="hundo" start={2} onClose={() => {}} />);
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  expect(screen.getByRole("img")).toHaveAttribute("src", `${hundo[2].src}.webp`);
});

test("an index past the end opens the last picture", () => {
  render(<PhoneViewer slug="hundo" start={9} onClose={() => {}} />);
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
});

test("Previous and Next step, dim and inert at the ends, and the focus stays on the button pressed", async () => {
  const user = userEvent.setup();
  render(<PhoneViewer slug="hundo" start={0} onClose={() => {}} />);
  expect(previous()).toHaveAttribute("aria-disabled", "true");
  expect(next()).toHaveAttribute("aria-disabled", "false");
  await user.click(previous());
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  await user.click(next());
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
  await user.click(next());
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  expect(next()).toHaveAttribute("aria-disabled", "true");
  expect(next()).toHaveFocus();
  await user.click(next());
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  await user.click(previous());
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
});

test("← and → step from wherever the focus is inside it, and stop at the ends", async () => {
  const user = userEvent.setup();
  render(<PhoneViewer slug="hundo" start={0} onClose={() => {}} />);
  await user.keyboard("{ArrowRight}");
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
  await user.keyboard("{ArrowRight}{ArrowRight}");
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
});

test("a swipe left shows the next picture and a swipe right the previous one", () => {
  render(<PhoneViewer slug="hundo" start={1} onClose={() => {}} />);
  swipe([300, 200], [200, 210]);
  expect(screen.getByText("3 of 3")).toBeInTheDocument();
  swipe([100, 200], [250, 190]);
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
});

test("a short move, a mostly vertical one, a swipe past the end and a gesture the browser took for a scroll all do nothing", () => {
  render(<PhoneViewer slug="hundo" start={0} onClose={() => {}} />);
  swipe([200, 200], [180, 200]);
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  swipe([200, 100], [140, 300]);
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  swipe([100, 200], [250, 200]);
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
  const box = within(dialog()).getByRole("img").closest(".dlg-box")!;
  fireEvent.pointerDown(box, { pointerId: 1, isPrimary: true, button: 0, clientX: 300, clientY: 200 });
  fireEvent.pointerCancel(box, { pointerId: 1 });
  fireEvent.pointerUp(box, { pointerId: 1, clientX: 100, clientY: 200 });
  expect(screen.getByText("1 of 3")).toBeInTheDocument();
});

test("Close, and cancel (Esc, Android's back), hand control to the host, and the focus goes back to the picture's button", async () => {
  const user = userEvent.setup();
  const onClosed = vi.fn();
  render(<Page onClosed={onClosed} />);
  const opener = screen.getByRole("button", { name: "Open picture" });
  await user.click(opener);
  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(onClosed).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
  await user.click(opener);
  await cancelDialog(dialog());
  expect(onClosed).toHaveBeenCalledTimes(2);
  expect(opener).toHaveFocus();
});

test("a project with no pictures, and an unknown one, draw nothing", () => {
  const none = render(<PhoneViewer slug="lucarne" start={0} onClose={() => {}} />);
  expect(none.container).toBeEmptyDOMElement();
  const unknown = render(<PhoneViewer slug="nope" start={0} onClose={() => {}} />);
  expect(unknown.container).toBeEmptyDOMElement();
});

test("the pictures either side of the one shown are decoded ahead, each once, and their count is on the box", async () => {
  const decoded: string[] = [];
  // jsdom has no `decode`.
  Object.defineProperty(HTMLImageElement.prototype, "decode", {
    configurable: true,
    value(this: HTMLImageElement) {
      decoded.push(this.getAttribute("src")!);
      return Promise.resolve();
    },
  });
  const user = userEvent.setup();
  render(<PhoneViewer slug="hundo" start={0} onClose={() => {}} />);
  const box = () => dialog().querySelector(".dlg-box")!;
  await waitFor(() => expect(box()).toHaveAttribute("data-ahead", "1"));
  expect(decoded).toEqual([`${hundo[1].src}.webp`]);
  await user.click(next());
  await waitFor(() => expect(box()).toHaveAttribute("data-ahead", "2"));
  expect(decoded).toEqual([`${hundo[1].src}.webp`, `${hundo[0].src}.webp`, `${hundo[2].src}.webp`]);
  await user.click(next());
  await user.click(previous());
  expect(decoded).toHaveLength(3);
});

test("under StrictMode, where the effect runs twice, the decoded neighbours are still counted", async () => {
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: () => Promise.resolve() });
  render(
    <StrictMode>
      <PhoneViewer slug="hundo" start={0} onClose={() => {}} />
    </StrictMode>,
  );
  await waitFor(() => expect(dialog().querySelector(".dlg-box")).toHaveAttribute("data-ahead", "1"));
});
