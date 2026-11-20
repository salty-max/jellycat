import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseReadme } from "../../../core/readme";
import { Shell } from "../shell";
import { browseView } from "./slot";

// The README's blocks come from the host, as a project's page gives them: no chunk to wait for.
const readmes = { hundo: parseReadme("# Hundo\n\n## How it's built\n\nA paragraph.\n") };

async function open() {
  const user = userEvent.setup();
  render(<Shell fullScreen={browseView} readmes={readmes} />);
  const input = screen.getByLabelText("Terminal input");
  await user.click(input);
  await user.type(input, "browse{Enter}");
  return { user, input };
}

const left = () => screen.getByRole("group", { name: "Directory" });
const right = () => screen.getByLabelText("Selection");
/** Selects the named row and presses Enter on it, as a keyboard would. */
async function enter(user: ReturnType<typeof userEvent.setup>, ...names: string[]) {
  for (const name of names) {
    await user.click(within(left()).getByRole("button", { name }));
    await user.keyboard("{Enter}");
  }
}
const title = () => document.querySelector(".sh-panes .sh-pt");
const selected = () => within(left()).getByRole("button", { current: true });

test("browse opens at ~ with the first entry selected, the titles in the borders and the key bar", async () => {
  await open();
  expect(screen.getByText(/^\[jellycat\] 0:browse\*$/)).toBeInTheDocument();
  expect(within(left()).getAllByRole("button").map((row) => row.textContent)).toEqual(["projects/", "contact.txt", "README"]);
  expect(selected()).toHaveTextContent("projects/");
  expect(screen.getByRole("button", { name: /Enter\s*open/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Bksp\s*up/ })).toBeInTheDocument();
});

test("j and k move and wrap, the arrows too, and the right pane follows", async () => {
  const { user } = await open();
  await user.keyboard("j");
  expect(selected()).toHaveTextContent("contact.txt");
  expect(right()).toHaveTextContent("Email");
  await user.keyboard("{ArrowDown}");
  expect(selected()).toHaveTextContent("README");
  await user.keyboard("j");
  expect(selected()).toHaveTextContent("projects/");
  await user.keyboard("k");
  expect(selected()).toHaveTextContent("README");
});

test("Enter goes into a directory, a project's directory shows its card, and Backspace comes back to where it was", async () => {
  const { user } = await open();
  await user.keyboard("{Enter}");
  expect(title()).toHaveTextContent("~/projects");
  await enter(user, "web/");
  expect(within(left()).getByRole("button", { name: "hundo/" })).toBeInTheDocument();
  await enter(user, "hundo/");
  expect(within(left()).getAllByRole("button").map((row) => row.textContent)).toEqual(["..", "README"]);
  await user.keyboard("{Backspace}");
  expect(selected()).toHaveTextContent("hundo/");
  expect(right()).toHaveTextContent("Stack");
  expect(right()).toHaveTextContent("~/projects/web/hundo/README");
  await user.keyboard("{Backspace}{Backspace}");
  expect(selected()).toHaveTextContent("projects/");
  await user.keyboard("{Backspace}");
  expect(title()?.textContent).toBe("~");
});

test("`..` goes up, and a README in the right pane is its text", async () => {
  const { user } = await open();
  await user.keyboard("{Enter}");
  await enter(user, "web/", "hundo/");
  await user.keyboard("j");
  await waitFor(() => expect(within(right()).getByRole("heading", { level: 2, name: "Hundo" })).toBeInTheDocument());
  await user.keyboard("k{Enter}");
  expect(title()).toHaveTextContent("~/projects/web");
});

test("a click selects a row and a click on the selected row opens it", async () => {
  const { user } = await open();
  await user.click(within(left()).getByRole("button", { name: "contact.txt" }));
  expect(selected()).toHaveTextContent("contact.txt");
  await user.click(within(left()).getByRole("button", { name: "projects/" }));
  await user.click(within(left()).getByRole("button", { name: "projects/" }));
  expect(title()).toHaveTextContent("~/projects");
});

test("Enter on a README pages it, and q there comes back to browse where it was", async () => {
  const { user } = await open();
  await user.keyboard("{Enter}");
  await enter(user, "web/", "hundo/", "README");
  expect(screen.getByText(/^\[jellycat\] 0:less\*$/)).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "~/projects/web/hundo/README" })).toBeInTheDocument();
  await user.keyboard("q");
  expect(screen.getByText(/^\[jellycat\] 0:browse\*$/)).toBeInTheDocument();
  expect(title()).toHaveTextContent("~/projects/web/hundo");
  expect(selected()).toHaveTextContent("README");
});

test("Enter on a text file pages it too", async () => {
  const { user } = await open();
  await user.keyboard("j{Enter}");
  expect(screen.getByRole("region", { name: "~/contact.txt" })).toBeInTheDocument();
  await user.keyboard("q");
  expect(selected()).toHaveTextContent("contact.txt");
});

test("q returns to the prompt as it was, and so does Esc; a new browse starts at ~ again", async () => {
  const { user, input } = await open();
  await user.keyboard("{Enter}q");
  expect(screen.getByRole("log")).toBeVisible();
  await user.type(input, "pwd{Enter}");
  expect(screen.getByText("/home/guest")).toBeInTheDocument();
  await user.type(input, "browse{Enter}");
  expect(title()?.textContent).toBe("~");
  await user.keyboard("{Escape}");
  expect(screen.getByRole("log")).toBeVisible();
});

test("the key bar works without a keyboard", async () => {
  const { user } = await open();
  await user.click(screen.getByRole("button", { name: /j k\s*move/ }));
  expect(selected()).toHaveTextContent("contact.txt");
  await user.click(screen.getByRole("button", { name: /q\s*quit/ }));
  expect(screen.getByRole("log")).toBeVisible();
});

test("browse opens in the directory the session was in", async () => {
  const user = userEvent.setup();
  render(<Shell fullScreen={browseView} readmes={readmes} />);
  const input = screen.getByLabelText("Terminal input");
  await user.click(input);
  await user.type(input, "cd projects/web{Enter}");
  await user.type(input, "browse{Enter}");
  expect(title()).toHaveTextContent("~/projects/web");
  expect(within(left()).getByRole("button", { name: "hundo/" })).toBeInTheDocument();
});

test("the status bar shows the browsed path, and the session's again once browse closes", async () => {
  const { user } = await open();
  const bar = () => document.querySelector(".sh-bar-right");
  expect(bar()?.textContent).toBe("~");
  await user.keyboard("{Enter}");
  expect(bar()).toHaveTextContent("~/projects");
  await enter(user, "web/", "hundo/", "README");
  // Paging a README is another view: its bar is the session's.
  expect(bar()?.textContent).toBe("~");
  await user.keyboard("q");
  expect(bar()).toHaveTextContent("~/projects/web/hundo");
  await user.keyboard("q");
  expect(bar()?.textContent).toBe("~");
});

test("a project link pressed in the README closes browse, and the next browse starts in the cwd, not where this one was", async () => {
  const user = userEvent.setup();
  const linked = { hundo: parseReadme("# Hundo\n\nSee [harness](/projects/harness).\n") };
  render(<Shell fullScreen={browseView} readmes={linked} />);
  const input = screen.getByLabelText("Terminal input");
  await user.click(input);
  await user.type(input, "browse{Enter}");
  await user.keyboard("{Enter}");
  await enter(user, "web/", "hundo/");
  await user.click(within(left()).getByRole("button", { name: "README" }));
  await user.click(within(right()).getByRole("link", { name: "harness" }));
  expect(screen.getByRole("log")).toBeVisible();
  await user.type(input, "cd projects{Enter}");
  await user.type(input, "browse{Enter}");
  expect(title()?.textContent).toBe("~/projects");
});
