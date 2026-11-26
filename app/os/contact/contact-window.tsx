import { ContactForm } from "./contact-form";

/** The Contact window's app: the form in its desktop look, with the focus in Name when it opens. Its text stays while the window is open. */
export function ContactWindow() {
  return <ContactForm look="desktop" autoFocus />;
}
