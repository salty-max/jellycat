import { useEffect, useId, useRef, useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import { CONTACT_FIELDS, CONTACT_LIMITS, HONEYPOT_FIELD, type ContactField, type ContactMessage } from "../../core/contact";
import { CONTACT_EMAIL } from "../../core/studio";
import { Notice } from "./notice";
import { sendContact } from "./send";
import { FIELD_ERRORS, LABELS, type ContactLook, type ContactState } from "./state";
import "./contact.css";

const never = () => () => {};

const EMPTY: ContactMessage = { name: "", email: "", message: "" };

/** The state's words. A failure names the address, as a link, for the visitor to write to. */
function Status({ state }: { state: ContactState }) {
  switch (state.kind) {
    case "sending":
      return "Sending...";
    case "sent":
      return "Message sent.";
    case "fast":
      return "Could not send the message. Try again.";
    case "failed":
      return (
        <>
          Could not send the message. Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </>
      );
    default:
      return null;
  }
}

/**
 * The contact form, one component in two looks (docs/design.md Contact): the desktop's window and the phone's page. Name, Email and
 * Message as the function's limits have them (app/core/contact.ts), a honeypot off screen, the privacy notice, Send and the state.
 * It posts with `fetch` (app/os/contact/send.ts); without script a visitor has the address on the page.
 *
 * A field the function refuses gets `aria-invalid` and its message, linked with `aria-describedby`, and the focus goes to the first;
 * editing a field takes its mark away. The state is a polite status, there from the first render so the change is announced.
 */
export function ContactForm({ look, autoFocus = false }: { look: ContactLook; autoFocus?: boolean }) {
  const id = useId();
  const [values, setValues] = useState<ContactMessage>(EMPTY);
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<ContactState>({ kind: "idle" });
  const sending = useRef(false);
  // Without script, or before hydration, a native submit would put the message in the address: Send waits for hydration (false in the prerendered markup).
  const ready = useSyncExternalStore(never, () => true, () => false);
  // The focus goes to the first field refused when an answer says so, and only then: editing a field changes the state again.
  const refused = useRef<ContactField[]>([]);
  const [refusals, setRefusals] = useState(0);
  // When the form opened (the effect, so the prerendered page and the first render agree); it goes to the function as `elapsed`.
  const opened = useRef(0);
  const controls = useRef<Partial<Record<ContactField, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  useEffect(() => {
    opened.current = performance.now();
    if (autoFocus) controls.current.name?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const first = CONTACT_FIELDS.find((field) => refused.current.includes(field));
    if (refusals > 0 && first) controls.current[first]?.focus();
  }, [refusals]);

  const invalid = (field: ContactField) => state.kind === "invalid" && state.fields.includes(field);
  const change = (field: ContactField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.currentTarget.value;
    setValues((now) => ({ ...now, [field]: value }));
    if (state.kind === "invalid" && state.fields.includes(field)) {
      const fields = state.fields.filter((each) => each !== field);
      setState(fields.length > 0 ? { kind: "invalid", fields } : { kind: "idle" });
    }
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setState({ kind: "sending" });
    const result = await sendContact(values, Math.round(performance.now() - opened.current), trap);
    sending.current = false;
    if (result.kind === "sent") setValues(EMPTY);
    setState(result);
    if (result.kind === "invalid") {
      refused.current = result.fields;
      setRefusals((count) => count + 1);
    }
  }

  const status = (
    <p role="status" className="ct-status">
      <Status state={state} />
    </p>
  );
  const send = (
    <button type="submit" className="ct-send" disabled={!ready} aria-disabled={state.kind === "sending" || undefined}>
      Send
    </button>
  );

  const field = (name: ContactField) => {
    const props = {
      id: `${id}-${name}`,
      name,
      className: "ct-input",
      required: true,
      maxLength: CONTACT_LIMITS[name],
      value: values[name],
      // What is typed while a send is on its way would be emptied with the rest when it succeeds.
      readOnly: state.kind === "sending",
      onChange: change(name),
      "aria-invalid": invalid(name) || undefined,
      "aria-describedby": invalid(name) ? `${id}-${name}-error` : undefined,
    };
    return (
      <div className="ct-field" key={name}>
        <label htmlFor={props.id} className={look === "desktop" ? "text-phosphor-dim" : undefined} data-field={name}>
          {LABELS[name]}
        </label>
        {name === "message" ? (
          <textarea {...props} ref={(node) => void (controls.current[name] = node)} rows={look === "phone" ? 6 : undefined} />
        ) : (
          <input {...props} ref={(node) => void (controls.current[name] = node)} type={name === "email" ? "email" : "text"} autoComplete={name} />
        )}
        {invalid(name) && (
          <p id={`${id}-${name}-error`} className="ct-error">
            {FIELD_ERRORS[name]}
          </p>
        )}
      </div>
    );
  };

  return (
    <form className="ct" data-look={look} onSubmit={(event) => void submit(event)}>
      <div className="ct-fields">
        {look === "desktop" && (
          <div className="ct-field">
            <span className="text-phosphor-dim">To</span>
            <span>{CONTACT_EMAIL}</span>
          </div>
        )}
        {CONTACT_FIELDS.map(field)}
      </div>
      {/* The honeypot: off screen, out of the tab order and the accessibility tree, under a name no autofill knows (core/contact.ts). */}
      <div aria-hidden="true" className="ct-trap">
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.currentTarget.value)} />
      </div>
      {look === "phone" && <p className="ct-line text-phosphor-dim">{`A message from this page goes by email to ${CONTACT_EMAIL}.`}</p>}
      <Notice scrolls={look === "desktop"} />
      <div className="ct-actions">
        {look === "desktop" ? (
          <>
            {status}
            {send}
          </>
        ) : (
          <>
            {send}
            {status}
          </>
        )}
      </div>
    </form>
  );
}
