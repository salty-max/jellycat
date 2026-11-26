import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CONTACT_EMAIL, GITHUB_URL } from "../../core/studio";
import { HOME_SECTIONS } from "../phone/home-sections";
import { PhoneContact } from "./contact-page";

test("the page: Contact as the h1, the Email and GitHub rows, then the form with its line and its notice", () => {
  render(<PhoneContact />);
  expect(screen.getByRole("heading", { level: 1, name: "Contact" })).toBeInTheDocument();
  const region = screen.getByRole("region", { name: "Contact" });
  expect(within(region).getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
  expect(within(region).getByRole("link", { name: "github.com/salty-max" })).toHaveAttribute("href", GITHUB_URL);
  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByText(`A message from this page goes by email to ${CONTACT_EMAIL}.`)).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Privacy notice" })).toBeInTheDocument();
});

test("the home page's Contact section: one card, linking to /contact", async () => {
  const section = HOME_SECTIONS.find((each) => each.id === "contact")!;
  expect(section).toMatchObject({ title: "Contact", icon: "mail" });
  expect(section.cards).toEqual([{ name: "Contact", href: "/contact", kind: "Email", description: `A message from this page goes by email to ${CONTACT_EMAIL}.` }]);
  const { PhoneHome } = await import("../phone/home");
  render(
    <MemoryRouter>
      <PhoneHome />
    </MemoryRouter>,
  );
  const card = within(screen.getByRole("region", { name: "Contact" })).getByRole("link", { name: "Contact" });
  expect(card).toHaveAttribute("href", "/contact");
});
