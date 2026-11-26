import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, test } from "vitest";
import { FOLDERS } from "../../core/projects";
import { PhoneHome } from "./home";

// The phone has no Lab (docs/phase-2.md, Q6): below the folders, one section with one card to Gero Lab, gero's playground.
test("the home page's Lab section holds one card, a link to Gero Lab that opens in a new tab", () => {
  render(
    <MemoryRouter>
      <PhoneHome />
    </MemoryRouter>,
  );
  const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
  expect(headings.slice(FOLDERS.length)).toEqual(["Lab"]);

  const lab = screen.getByRole("region", { name: "Lab" });
  const link = within(lab).getByRole("link", { name: "Gero Lab" });
  expect(link).toHaveAttribute("href", "https://gero-lab.vercel.app");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener");
  expect(within(lab).getAllByRole("listitem")).toHaveLength(1);
  expect(within(lab).getByText("gero-lab.vercel.app")).toHaveClass("text-phosphor-dim");
  expect(within(lab).getByText("Browser playground for the Gero VM.")).toBeInTheDocument();
});
