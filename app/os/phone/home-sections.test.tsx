import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, test, vi } from "vitest";
import { FOLDERS } from "../../core/projects";
import { PhoneHome } from "./home";

// The list is empty until the Lab's and Contact's tasks fill it: two stand-ins here, one card going off the site, one to a page.
vi.mock("./home-sections", () => ({
  HOME_SECTIONS: [
    { id: "away", title: "Away", icon: "app", cards: [{ name: "Elsewhere", href: "https://example.com", kind: "example.com", description: "A line." }] },
    { id: "here", title: "Here", icon: "doc", cards: [{ name: "A page", href: "/a-page", kind: "Page", description: "Another line." }] },
  ],
}));

test("the sections below the folders: a title bar like a folder's, then cards drawn as a project's", () => {
  render(
    <MemoryRouter>
      <PhoneHome />
    </MemoryRouter>,
  );
  const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
  expect(headings.slice(FOLDERS.length)).toEqual(["Away", "Here"]);

  const away = screen.getByRole("region", { name: "Away" });
  const off = within(away).getByRole("link", { name: "Elsewhere" });
  expect(off).toHaveAttribute("href", "https://example.com");
  expect(off).toHaveAttribute("target", "_blank");
  expect(off).toHaveAttribute("rel", "noopener");
  expect(within(away).getByText("example.com")).toHaveClass("text-phosphor-dim");
  expect(within(away).getByText("A line.")).toBeInTheDocument();

  const here = within(screen.getByRole("region", { name: "Here" })).getByRole("link", { name: "A page" });
  expect(here).toHaveAttribute("href", "/a-page");
  expect(here).not.toHaveAttribute("target");
});
