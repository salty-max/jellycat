import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CONTACT_LIMITS, ELAPSED_FIELD, HONEYPOT_FIELD } from "../../core/contact";
import { PRIVACY_NOTICE } from "../../core/privacy";
import { CONTACT_EMAIL, plainText } from "../../core/studio";
import { ContactForm } from "./contact-form";
import { FIELD_ERRORS, type ContactLook } from "./state";

// The form in both looks, with `fetch` replaced: what it posts, what it shows for each answer, and how it is made for a screen reader.

const answer = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
const posted = (fetchMock: ReturnType<typeof vi.fn>) => JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<string, unknown>;

async function fill(name = "Ada", email = "ada@example.com", message = "Hello there.") {
  await userEvent.type(screen.getByLabelText("Name"), name);
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Message"), message);
}

const send = () => userEvent.click(screen.getByRole("button", { name: "Send" }));

for (const look of ["desktop", "phone"] as const satisfies readonly ContactLook[]) {
  describe(`the ${look} look`, () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      fetchMock = vi.fn(() => answer(200, { ok: true }));
      vi.stubGlobal("fetch", fetchMock);
    });
    afterEach(() => vi.unstubAllGlobals());

    it("has a labelled, required field for each of the three, limited as the function limits them", () => {
      render(<ContactForm look={look} />);
      const name = screen.getByLabelText("Name");
      const email = screen.getByLabelText("Email");
      const message = screen.getByLabelText("Message");
      for (const [control, field] of [[name, "name"], [email, "email"], [message, "message"]] as const) {
        expect(control, field).toBeRequired();
        expect(control, field).toHaveAttribute("maxlength", String(CONTACT_LIMITS[field]));
        expect(control, field).toHaveAttribute("name", field);
      }
      expect(email).toHaveAttribute("type", "email");
      expect(email).toHaveAttribute("autocomplete", "email");
      expect(message.tagName).toBe("TEXTAREA");
    });

    it("renders the approved notice, word for word, with its address a link", () => {
      render(<ContactForm look={look} />);
      const notice = screen.getByRole("region", { name: "Privacy notice" });
      expect(notice.textContent).toBe(PRIVACY_NOTICE.map((line) => line.map((span) => (typeof span === "string" ? span : span.text)).join("")).join(""));
      expect(plainText(PRIVACY_NOTICE)).toContain("Jellycat Studio receives your name, email and message");
      expect(within(notice).getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
      expect(notice).toHaveClass("text-phosphor-dim");
      // Only the desktop's box scrolls, so only it is a tab stop.
      if (look === "desktop") expect(notice).toHaveAttribute("tabindex", "0");
      else expect(notice).not.toHaveAttribute("tabindex");
    });

    it("keeps a honeypot out of sight, out of the tab order and out of the accessibility tree", () => {
      const { container } = render(<ContactForm look={look} />);
      const trap = container.querySelector<HTMLInputElement>(`input[name="${HONEYPOT_FIELD}"]`)!;
      expect(trap).toHaveAttribute("tabindex", "-1");
      expect(trap).toHaveAttribute("autocomplete", "off");
      expect(trap.closest("[aria-hidden='true']")).not.toBeNull();
      expect(screen.queryByRole("textbox", { name: /jc_trap/ })).toBeNull();
      // Name, Email and Message: the honeypot is not among them.
      expect(screen.getAllByRole("textbox")).toHaveLength(3);
    });

    it("posts the message with how long it was open and an empty honeypot, shows Sending... then Message sent., and empties the fields", async () => {
      let release: (response: Response) => void = () => {};
      fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (release = resolve)));
      render(<ContactForm look={look} />);
      await fill();
      await send();
      expect(screen.getByRole("status")).toHaveTextContent("Sending...");
      expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("aria-disabled", "true");
      expect(fetchMock).toHaveBeenCalledOnce();
      const body = posted(fetchMock);
      expect(body).toMatchObject({ name: "Ada", email: "ada@example.com", message: "Hello there.", [HONEYPOT_FIELD]: "" });
      expect(typeof body[ELAPSED_FIELD]).toBe("number");
      await act(async () => release(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      expect(await screen.findByText("Message sent.")).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toHaveValue("");
      expect(screen.getByLabelText("Message")).toHaveValue("");
      expect(screen.getByRole("button", { name: "Send" })).not.toHaveAttribute("aria-disabled");
    });

    it("doesn't post a second time while one is on its way", async () => {
      fetchMock.mockReturnValueOnce(new Promise(() => {}));
      render(<ContactForm look={look} />);
      await fill();
      const form = screen.getByRole("button", { name: "Send" }).closest("form")!;
      fireEvent.submit(form);
      fireEvent.submit(form);
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("sends what an autofill put in the honeypot as it is (the function answers as if it sent, and sends nothing)", async () => {
      const { container } = render(<ContactForm look={look} />);
      await fill();
      fireEvent.change(container.querySelector(`input[name="${HONEYPOT_FIELD}"]`)!, { target: { value: "filled by a bot" } });
      await send();
      expect(posted(fetchMock)[HONEYPOT_FIELD]).toBe("filled by a bot");
    });

    it("says why when the form was sent too soon, and keeps what was typed", async () => {
      fetchMock.mockReturnValueOnce(answer(400, { ok: false, error: "fast" }));
      render(<ContactForm look={look} />);
      await fill();
      await send();
      expect(await screen.findByText("Could not send the message. Try again.")).toBeInTheDocument();
      expect(screen.getByLabelText("Message")).toHaveValue("Hello there.");
    });

    it("names the address, as a link, when the message could not go", async () => {
      fetchMock.mockReturnValueOnce(answer(503, { ok: false, error: "unconfigured" }));
      render(<ContactForm look={look} />);
      await fill();
      await send();
      const status = screen.getByRole("status");
      await waitFor(() => expect(status).toHaveTextContent(`Could not send the message. Write to ${CONTACT_EMAIL}.`));
      expect(within(status).getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
      expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    });

    it("says the same when the network is down", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      render(<ContactForm look={look} />);
      await fill();
      await send();
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(`Write to ${CONTACT_EMAIL}.`));
    });

    it("marks the fields the function refused, links their messages and focuses the first", async () => {
      fetchMock.mockReturnValueOnce(answer(400, { ok: false, error: "invalid", fields: ["email", "message"] }));
      render(<ContactForm look={look} />);
      await fill("Ada", "ada@b", "Hi");
      await send();
      const email = screen.getByLabelText("Email");
      const message = screen.getByLabelText("Message");
      await waitFor(() => expect(email).toHaveFocus());
      expect(email).toHaveAttribute("aria-invalid", "true");
      expect(email).toHaveAccessibleDescription(FIELD_ERRORS.email);
      expect(message).toHaveAttribute("aria-invalid", "true");
      expect(message).toHaveAccessibleDescription(FIELD_ERRORS.message);
      expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
      expect(screen.getByRole("status")).toBeEmptyDOMElement();

      // Editing a field takes its mark and message away, and the focus stays where the visitor is typing; the other keeps its own.
      await userEvent.type(email, "xy");
      expect(email).toHaveFocus();
      expect(email).not.toHaveAttribute("aria-invalid");
      expect(email).not.toHaveAttribute("aria-describedby");
      expect(screen.queryByText(FIELD_ERRORS.email)).toBeNull();
      expect(message).toHaveAttribute("aria-invalid", "true");
    });
  });
}

describe("the looks differ where the mockup does", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("the desktop's names who gets the message; the phone's says it in a line", () => {
    const { unmount } = render(<ContactForm look="desktop" />);
    expect(screen.getByText("To")).toBeInTheDocument();
    expect(screen.getByText("To").nextElementSibling).toHaveTextContent(CONTACT_EMAIL);
    expect(screen.queryByText(`A message from this page goes by email to ${CONTACT_EMAIL}.`)).toBeNull();
    unmount();
    render(<ContactForm look="phone" />);
    expect(screen.queryByText("To")).toBeNull();
    expect(screen.getByText(`A message from this page goes by email to ${CONTACT_EMAIL}.`)).toBeInTheDocument();
  });

  it("the window puts the focus in Name; the page doesn't", () => {
    const { unmount } = render(<ContactForm look="desktop" autoFocus />);
    expect(screen.getByLabelText("Name")).toHaveFocus();
    unmount();
    render(<ContactForm look="phone" />);
    expect(screen.getByLabelText("Name")).not.toHaveFocus();
  });
});
