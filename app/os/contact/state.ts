import type { ContactField } from "../../core/contact";

/** Where the form is drawn: the Contact window (the desktop's look) or the /contact page (the phone's). */
export type ContactLook = "desktop" | "phone";

/** What the form shows under the fields. `invalid` carries the fields the function refused. */
export type ContactState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "fast" }
  | { kind: "failed" }
  | { kind: "invalid"; fields: ContactField[] };

/** The fields' labels. */
export const LABELS: Record<ContactField, string> = { name: "Name", email: "Email", message: "Message" };

/** What a field the function refused says under it. */
export const FIELD_ERRORS: Record<ContactField, string> = {
  name: "Enter a name.",
  email: "Enter a valid email address.",
  message: "Enter a message.",
};
