import { ContactRows } from "../phone/contact-rows";
import { ContactForm } from "./contact-form";

/** The /contact page on a phone: `Contact` as the `h1`, the Email and GitHub rows as on the home page, then the form. */
export function PhoneContact() {
  return (
    <div className="ph-wrap">
      <section aria-labelledby="ph-contact" className="ct-intro">
        <h1 id="ph-contact" className="ph-h1">
          Contact
        </h1>
        <ContactRows />
      </section>
      <ContactForm look="phone" />
    </div>
  );
}
