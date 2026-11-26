import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useLoaderData, useMatches, useNavigate, useParams } from "react-router";
import { beforeAll, beforeEach, expect, test } from "vitest";
import { projectBySlug } from "../../core/projects";
import type { Block } from "../../core/readme";
import Home, { handle as homeHandle } from "../../routes/home";
import Project, { handle as projectHandle } from "../../routes/project";
import { osPage } from "../os-route";
import { PhoneLayout } from "./phone-layout";
import { cancelDialog, stubDialog } from "./test-dialog";

// The sheet is a chunk of its own, loaded on first use: loaded here once, so a test doesn't wait on a busy machine's import.
beforeAll(async () => {
  await import("./control-panel-sheet");
});

beforeEach(() => {
  stubDialog();
  document.documentElement.removeAttribute("style");
});

const hundo = projectBySlug("hundo")!;
const blocks: readonly Block[] = [{ kind: "title", text: "Hundo" }];

// The OS's layout as the root draws it: the page the address names, read from the matches.
function Layout() {
  return (
    <>
      <PhoneLayout route={osPage(useMatches())} />
      <Mover />
    </>
  );
}
// A move from outside the page, as a script or the browser's history makes one.
function Mover() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/")}>
        Move home
      </button>
      <button type="button" onClick={() => navigate(`/projects/${hundo.slug}`)}>
        Move to Hundo
      </button>
    </>
  );
}
// The project route's element with the props the framework gives it (a plain data router gives none).
function ProjectElement() {
  const props = { loaderData: useLoaderData(), params: useParams() } as unknown as Parameters<typeof Project>[0];
  return <Project {...props} />;
}
const move = (name: string) => act(async () => screen.getByRole("button", { name, hidden: true }).click());
// The two OS routes with their real elements and handles, the README's blocks as their loader's data.
const at = (slug?: string) =>
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          {
            id: "root",
            path: "/",
            Component: Layout,
            children: [
              { id: "home", index: true, handle: homeHandle, Component: Home },
              { id: "project", path: "projects/:slug", handle: projectHandle, loader: () => ({ blocks }), Component: ProjectElement },
            ],
          },
        ],
        { initialEntries: [slug ? `/projects/${slug}` : "/"], hydrationData: { loaderData: slug ? { project: { blocks } } : {} } },
      )}
    />,
  );

test("the home page without a project, the project's page with its README with one", () => {
  const { unmount } = at();
  expect(screen.getByRole("heading", { level: 1, name: "Jellycat Studio" })).toBeInTheDocument();
  unmount();
  at(hundo.slug);
  expect(screen.getByRole("heading", { level: 1, name: hundo.name })).toBeInTheDocument();
  expect(within(screen.getByRole("region", { name: "README" })).getByRole("heading", { level: 2, name: "Hundo" })).toBeInTheDocument();
});

test("the header's button opens the Control Panel's sheet, says so, and takes the focus back when it closes", async () => {
  const user = userEvent.setup();
  at();
  const button = screen.getByRole("button", { name: "Control Panel" });
  await user.click(button);
  const sheet = await screen.findByRole("dialog", { name: "Control Panel" });
  expect(button).toHaveAttribute("aria-expanded", "true");
  await cancelDialog(sheet);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(button).toHaveAttribute("aria-expanded", "false");
  expect(button).toHaveFocus();
});

test("a picture opens the viewer at it, and Close takes the focus back to that picture", async () => {
  const user = userEvent.setup();
  at(hundo.slug);
  const pictures = within(screen.getByRole("region", { name: /Screenshots/ })).getAllByRole("button");
  await user.click(pictures[1]);
  const viewer = screen.getByRole("dialog", { name: `${hundo.name} screenshots` });
  expect(within(viewer).getByRole("status")).toHaveTextContent(`2 of ${hundo.screenshots.length}`);
  await user.click(within(viewer).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(pictures[1]).toHaveFocus();
});

test("a move to another page closes the viewer", async () => {
  const user = userEvent.setup();
  at(hundo.slug);
  await user.click(within(screen.getByRole("region", { name: /Screenshots/ })).getAllByRole("button")[0]);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  await move("Move home");
  expect(screen.getByRole("heading", { level: 1, name: "Jellycat Studio" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  // Coming back doesn't open it again.
  await move("Move to Hundo");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
