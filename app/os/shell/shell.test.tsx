import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { vi } from "vitest";
import { loadReadme, parseReadme } from "../../core/readme";
import { useSettings } from "../../core/settings";
import { settle } from "../../test-act";
import type { FullScreenSlot } from "./full-screen";
import { Shell, type ShellProps } from "./shell";

// The first load of a README chunk transforms it in jsdom: do it once, before the tests that read one.
beforeAll(() => loadReadme("hundo"));

const prompt = (path = "~") => `guest@jellycat:${path}$ `;

function setup(props: ShellProps = {}) {
  const user = userEvent.setup();
  const view = render(<Shell {...props} />);
  const input = screen.getByLabelText("Terminal input");
  const log = screen.getByRole("log");
  const type = async (line: string) => {
    await user.click(input);
    await user.type(input, `${line}{Enter}`);
  };
  // A line that reads a README suspends on its chunk the first time (see settle): Enter goes through an awaited act.
  const typeSettled = async (line: string) => {
    await user.click(input);
    await user.type(input, line);
    await settle(() => fireEvent.keyDown(input, { key: "Enter" }));
  };
  return { user, input, log, type, typeSettled, ...view };
}

test("first paint is the welcome and the prompt, with a labelled input that has no focus", () => {
  const { input, log } = setup();
  expect(within(log).getByText(/Type help for the commands/)).toBeInTheDocument();
  expect(within(log).getByRole("button", { name: "open hundo" })).toBeInTheDocument();
  expect(input).not.toHaveFocus();
  expect(screen.getByText(/^guest@jellycat:~\$/)).toBeInTheDocument();
  expect(screen.getByText(/^\[jellycat\] 0:jsh\*$/)).toBeInTheDocument();
});

test("the clock is client-only: the server's markup has none, the client fills it in", async () => {
  expect(renderToString(<Shell />)).not.toMatch(/\d\d:\d\d/);
  setup();
  expect(await screen.findByText(/^\d\d:\d\d$/)).toBeInTheDocument();
});

test("a line is echoed with its prompt, and its names are links and buttons", async () => {
  const { log, type } = setup();
  await type("cd projects/web");
  await type("ls");
  expect(within(log).getByText(`${prompt()}cd projects/web`)).toBeInTheDocument();
  expect(within(log).getByText(`${prompt("~/projects/web")}ls`)).toBeInTheDocument();
  expect(within(log).getByRole("link", { name: "hundo/" })).toHaveAttribute("href", "/projects/hundo");
  expect(screen.getByText("~/projects/web")).toBeInTheDocument();
});

test("an unknown command prints the shell's message", async () => {
  const { log, type } = setup();
  await type("frobnicate");
  expect(within(log).getByText("jsh: frobnicate: command not found")).toBeInTheDocument();
});

test("pressing a command's name runs it, and the focus stays on the prompt", async () => {
  const { user, log, input } = setup();
  await user.click(input);
  await user.click(within(log).getByRole("button", { name: "tree" }));
  expect(within(log).getByText(`${prompt()}tree`)).toBeInTheDocument();
  expect(within(log).getByText("~/projects")).toBeInTheDocument();
  expect(input).toHaveFocus();
});

test("Tab completes a command, and lists names that share no more letters", async () => {
  const { user, input, log } = setup();
  await user.click(input);
  await user.type(input, "hel{Tab}");
  expect(input).toHaveValue("help ");
  await user.clear(input);
  await user.type(input, "c{Tab}");
  expect(within(log).getByText(/^cd\s+cat\s+crt\s+clear$/)).toBeInTheDocument();
});

test("Tab on an empty line, and Shift+Tab, move the focus: the keyboard can always leave the prompt", async () => {
  const { user, input } = setup();
  await user.click(input);
  await user.keyboard("{Tab}");
  expect(input).not.toHaveFocus();
  await user.click(input);
  await user.type(input, "hel");
  await user.keyboard("{Shift>}{Tab}{/Shift}");
  expect(input).not.toHaveFocus();
  expect(input).toHaveValue("hel");
});

test("↑ and ↓ walk the history", async () => {
  const { user, input, type } = setup();
  await type("pwd");
  await type("whoami");
  await user.keyboard("{ArrowUp}");
  expect(input).toHaveValue("whoami");
  await user.keyboard("{ArrowUp}");
  expect(input).toHaveValue("pwd");
  await user.keyboard("{ArrowDown}{ArrowDown}");
  expect(input).toHaveValue("");
});

test("Ctrl-U clears the line, Ctrl-C abandons it with ^C, Ctrl-L clears the log", async () => {
  const { user, input, log } = setup();
  await user.click(input);
  await user.type(input, "abc{Control>}u{/Control}");
  expect(input).toHaveValue("");
  await user.type(input, "abc{Control>}c{/Control}");
  expect(input).toHaveValue("");
  expect(within(log).getByText(`${prompt()}abc^C`)).toBeInTheDocument();
  await user.keyboard("{Control>}l{/Control}");
  expect(within(log).queryByText(/Type help/)).not.toBeInTheDocument();
});

test("clear empties the log, its own echo included", async () => {
  const { log, type } = setup();
  await type("echo hi");
  await type("clear");
  expect(within(log).queryByText("hi")).not.toBeInTheDocument();
  expect(within(log).queryByText(`${prompt()}clear`)).not.toBeInTheDocument();
});

test("theme and crt go to the settings store", async () => {
  const { type } = setup();
  await type("theme amber");
  expect(useSettings.getState().phosphor).toBe("amber");
  await type("crt off");
  expect(useSettings.getState()).toMatchObject({ scanlines: false, glow: false });
});

test("open prints the card and tells the host; a project's link runs open", async () => {
  const onOpenProject = vi.fn();
  const { user, log, type } = setup({ onOpenProject });
  await type("open hundo");
  expect(onOpenProject).toHaveBeenCalledWith("hundo");
  expect(within(log).getByText("Stack")).toBeInTheDocument();
  expect(within(log).getByRole("button", { name: "~/projects/web/hundo/README" })).toBeInTheDocument();
  await type("tree");
  await user.click(within(log).getAllByRole("link", { name: "farseer" })[0]);
  expect(onOpenProject).toHaveBeenLastCalledWith("farseer");
});

test("cat prints a README as real headings, lists and code", async () => {
  const { log, typeSettled } = setup();
  await typeSettled("cat ~/projects/web/hundo/README");
  expect(await within(log).findByRole("heading", { level: 2, name: "Hundo" })).toBeInTheDocument();
  expect(within(log).getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0);
  expect(within(log).getAllByRole("list").length).toBeGreaterThan(0);
});

test("cat prints the blocks the host gave it, without loading the chunk", async () => {
  const readmes = { hundo: parseReadme("# Given\n\nA paragraph with `code`.\n") };
  const { log, type } = setup({ readmes });
  await type("cat ~/projects/web/hundo/README");
  expect(within(log).getByRole("heading", { name: "Given" })).toBeInTheDocument();
  expect(within(log).getByText("code")).toBeInTheDocument();
});

test("a view opened by Enter on a name in the log gives the focus to the prompt's input, so its keys reach it", async () => {
  const { user, type, input } = setup();
  await type("open hundo");
  screen.getByRole("button", { name: "~/projects/web/hundo/README" }).focus();
  await settle(() => fireEvent.click(screen.getByRole("button", { name: "~/projects/web/hundo/README" })));
  expect(await screen.findByRole("region", { name: "~/projects/web/hundo/README" })).toBeInTheDocument();
  expect(input).toHaveFocus();
  await user.keyboard("q");
  expect(screen.queryByRole("region", { name: "~/projects/web/hundo/README" })).toBeNull();
});

test("less pages a README full screen: the path, the position, the key bar, and q goes back", async () => {
  const { user, input, typeSettled } = setup();
  await typeSettled("less ~/projects/web/hundo/README");
  expect(await screen.findByRole("heading", { name: "Hundo" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "~/projects/web/hundo/README" })).toBeInTheDocument();
  expect(screen.getByText(/^\[jellycat\] 0:less\*$/)).toBeInTheDocument();
  expect(screen.getByText(/^(top|end|\d+%)$/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /scroll/ })).toBeInTheDocument();
  await user.type(input, "j");
  expect(screen.getByRole("log", { hidden: true })).not.toBeVisible();
  await user.type(input, "q");
  expect(screen.getByRole("log")).toBeVisible();
  expect(screen.getByText(/^\[jellycat\] 0:jsh\*$/)).toBeInTheDocument();
});

test("the key bar works without a keyboard", async () => {
  const { user, type } = setup();
  await type("less ~/README");
  await user.click(screen.getByRole("button", { name: /quit/ }));
  expect(screen.getByRole("log")).toBeVisible();
});

test("in the pager a project link closes it and runs open; an https link opens in a new tab", async () => {
  const onOpenProject = vi.fn();
  const { user, type } = setup({ onOpenProject, readmes: { hundo: parseReadme("# Hundo\n\nSee [Farseer](/projects/farseer) and [the site](https://hundo.quest).\n") } });
  await type("less ~/projects/web/hundo/README");
  expect(screen.getByRole("link", { name: "the site" })).toHaveAttribute("target", "_blank");
  await user.click(screen.getByRole("link", { name: "Farseer" }));
  expect(onOpenProject).toHaveBeenCalledWith("farseer");
  expect(screen.getByRole("log")).toBeVisible();
});

test("less pages a text file's lines; more prints a file that fits", async () => {
  const { type, log, user, input } = setup();
  await type("less ~/contact.txt");
  expect(screen.getByRole("region", { name: "~/contact.txt" })).toBeInTheDocument();
  await user.type(input, "q");
  // jsdom has no layout: give the screen room, so the two-line file fits.
  const term = log.parentElement!;
  Object.defineProperty(term, "clientHeight", { configurable: true, value: 23 * 20 });
  await type("more ~/contact.txt");
  expect(screen.getByRole("log")).toBeVisible();
  expect(within(log).getAllByText(/Email/).length).toBe(1);
});

test("browse and view go to the host's full-screen slot, and q comes back", async () => {
  const fullScreen = vi.fn<FullScreenSlot>((view) => <p>host: {view.kind}</p>);
  const { type, user, input } = setup({ fullScreen });
  await type("browse");
  expect(screen.getByText("host: browse")).toBeInTheDocument();
  expect(screen.getByText(/^\[jellycat\] 0:browse\*$/)).toBeInTheDocument();
  expect(fullScreen).toHaveBeenCalledWith({ kind: "browse", cwd: [] }, expect.objectContaining({ close: expect.any(Function) }));
  // The host's view closes itself through the API it was given.
  const api = fullScreen.mock.calls.at(-1)![1];
  act(() => api.close());
  expect(screen.getByRole("log")).toBeVisible();
  await user.click(input);
  await type("view hundo");
  expect(fullScreen).toHaveBeenLastCalledWith({ kind: "view", slug: "hundo" }, expect.anything());
});

test("without a host the full-screen views are a placeholder, and q leaves it", async () => {
  const { type, user, input } = setup();
  await type("browse");
  expect(screen.getByText(/placeholder/)).toBeInTheDocument();
  await user.type(input, "q");
  expect(screen.getByRole("log")).toBeVisible();
});

test("a key in a full-screen view never reaches the prompt behind it", async () => {
  const { type, user, input } = setup();
  await type("browse");
  await user.type(input, "xyz");
  expect(input).toHaveValue("");
});

test("logout plays the typed login, and any key skips to the end", async () => {
  const { type, user, log } = setup();
  await type("logout");
  expect(within(log).getByText("Jelly-OS 1.0 tty1")).toBeInTheDocument();
  expect(within(log).queryByText(/Type help/)).not.toBeInTheDocument();
  await user.keyboard("x");
  await waitFor(() => expect(within(log).getByText(/^Last login: /)).toBeInTheDocument());
  expect(within(log).getByText("jellycat login: guest")).toBeInTheDocument();
  expect(within(log).getByText(/Type help for the commands/)).toBeInTheDocument();
});

test("the initial command is printed at first paint, as typed, with the project's name as the h1", () => {
  const onOpenProject = vi.fn();
  const html = renderToString(<Shell initialCommand="open hundo" onOpenProject={onOpenProject} />);
  expect(html).toContain("guest@jellycat:~$ open hundo");
  expect(html).toMatch(/<h1[^>]*>Hundo<\/h1>/);
  expect(onOpenProject).not.toHaveBeenCalled();
});

test("several initial commands run one after the other, each at its own prompt, as a project's page opens", async () => {
  const readmes = { hundo: parseReadme("# Hundo\n\n## How it's built\n\nA paragraph.\n") };
  const html = renderToString(<Shell initialCommand={["open hundo", "cat ~/projects/web/hundo/README"]} readmes={readmes} />);
  expect(html).toContain("guest@jellycat:~$ open hundo<");
  expect(html).toContain("guest@jellycat:~$ cat ~/projects/web/hundo/README<");
  // The card's name is the page's h1, the README's title and headings its h2 and h3, from the blocks given (no chunk to wait for).
  expect(html).toMatch(/<h1[^>]*>Hundo<\/h1>/);
  expect(html).toContain("<h2>Hundo</h2>");
  expect(html).toContain("<h3>How it&#x27;s built</h3>");

  const { user, input } = setup({ initialCommand: ["open hundo", "pwd"] });
  await user.click(input);
  await user.keyboard("{ArrowUp}");
  expect(input).toHaveValue("pwd");
  await user.keyboard("{ArrowUp}");
  expect(input).toHaveValue("open hundo");
});

test("the history of the initial command is the session's", async () => {
  const { user, input } = setup({ initialCommand: "pwd" });
  await user.click(input);
  await user.keyboard("{ArrowUp}");
  expect(input).toHaveValue("pwd");
});

test("a host's onPage takes a paged file and prints its lines; null leaves it to the pager", async () => {
  const taken = setup({ onPage: () => [[{ kind: "text", text: "opened by the host" }]] });
  await taken.type("less ~/README");
  expect(await screen.findByText("opened by the host")).toBeInTheDocument();
  expect(screen.getByText(/^\[jellycat\] 0:jsh\*$/)).toBeInTheDocument();
  taken.unmount();
  const left = setup({ onPage: () => null });
  await left.type("less ~/README");
  expect(await screen.findByText(/^\[jellycat\] 0:less\*$/)).toBeInTheDocument();
});
