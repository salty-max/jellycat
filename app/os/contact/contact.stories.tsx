import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { expect, userEvent, within } from "storybook/test";
import { DEFAULT_SETTINGS, useSettings } from "../../core/settings";
import { Crt } from "../crt";
import { Desktop } from "../desktop/desktop";
import { openContact } from "../desktop/apps/launch";
import { useWindows } from "../desktop/windows/store";
import { PhonePage } from "../phone/page";
import { PhoneContact } from "./contact-page";

// The contact form in both looks, at the mockups' frames: the Contact window over the desktop (652x480, #d-contact) and the /contact
// page (412 wide, #p-contact). `fetch` is not touched: the stories only draw and fill the form. Every story runs under each phosphor,
// with axe.
function DesktopContact() {
  useState(() => {
    useWindows.setState(useWindows.getInitialState(), true);
    useSettings.setState(DEFAULT_SETTINGS);
    useWindows.getState().setDesk({ w: 652, h: 456 });
    openContact();
  });
  return <Desktop />;
}

const meta = {
  title: "OS/Contact",
  component: DesktopContact,
} satisfies Meta<typeof DesktopContact>;
export default meta;
type Story = StoryObj<typeof meta>;

const onDesktop: Decorator = (Story) => (
  <div className="h-120 w-163">
    <Crt>
      <Story />
    </Crt>
  </div>
);

/** The window as the mockup draws it: To, the three fields, the notice in its box, Send. */
export const Window: Story = {
  decorators: [onDesktop],
  play: async ({ canvasElement }) => {
    const contact = within(canvasElement).getByRole("dialog", { name: "Contact" });
    await expect(within(contact).getByLabelText("Name")).toBeInTheDocument();
    await expect(within(contact).getByRole("region", { name: "Privacy notice" })).toBeInTheDocument();
    await expect(within(contact).getByRole("button", { name: "Send" })).toBeInTheDocument();
  },
};

/** What was typed stays in the window. */
export const WindowFilled: Story = {
  decorators: [onDesktop],
  play: async ({ canvasElement }) => {
    const contact = within(canvasElement).getByRole("dialog", { name: "Contact" });
    await userEvent.type(within(contact).getByLabelText("Name"), "Ada");
    await userEvent.type(within(contact).getByLabelText("Email"), "ada@example.com");
    await userEvent.type(within(contact).getByLabelText("Message"), "Hello.");
    await expect(within(contact).getByLabelText("Message")).toHaveValue("Hello.");
  },
};

const onPhone: Decorator = (Story) => (
  <MemoryRouter>
    <Story />
  </MemoryRouter>
);

/** The /contact page: the rows, the fields, the line, the notice and Send, in the phone's page. */
export const Page: Story = {
  decorators: [onPhone],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PhonePage onOpenPanel={() => {}}>
      <PhoneContact />
    </PhonePage>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Contact" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Send" })).toBeInTheDocument();
  },
};
