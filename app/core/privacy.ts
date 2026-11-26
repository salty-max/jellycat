// The contact form's privacy notice (docs/phase-2.md, Q8 and N1): shown under the form's fields, on /contact and in the Contact
// window. Its words are the user's to approve; a change to them goes back to the user.

import { CONTACT_EMAIL, type Span, type TextFile } from "./studio";

/** The company that sends the form's e-mail (docs/phase-2.md, Q1). */
export const PROCESSOR = "Resend";

/** How long Resend keeps a sent e-mail on the free plan (its pricing page). */
export const RETENTION_DAYS = 30;

/**
 * Where Resend sends from: the region picked when jellycat.fr is added there (U1), named as Resend's regions page names it
 * (North Virginia, Ireland, São Paulo or Tokyo): Ireland (eu-west-1), the user's pick in U1. The region only decides where the e-mail
 * is sent from: Resend stores what it keeps (the message, its logs) in the United States whatever the region (its regions page,
 * "Data Residency", and its GDPR page, read 22 Nov 2026), so the notice says so.
 */
export const SENDING_REGION = "Ireland";

const email: Span = { text: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` };

/** What covers the transfer to the US: Resend's DPA (section 6) relies on the EU's standard contractual clauses. */
export const SAFEGUARD = "the EU's standard contractual clauses";

/** The site's host, which sees every request, the form's included (its privacy notice: it collects visitors' IP addresses). */
export const HOST = "Vercel";

/**
 * How long Vercel keeps the site's runtime logs: 30 days with Observability Plus, 1 day without (its runtime logs page). Read
 * 26 Nov 2026 with GETs: the team has Observability Plus (its billing record) and no project has it turned off
 * (`/v1/observability/manage/configuration/projects` lists none). Turned off, this becomes 1 and the notice goes back to the user.
 * The notice doesn't say the IP address is in those logs: Vercel's docs list no such field, and there were no entries to check.
 */
export const HOST_LOG_DAYS = 30;

/** The authority a visitor can complain to (GDPR Art. 13 asks the notice to say so): the CNIL, the user's answer (Q8). */
export const AUTHORITY = "the CNIL, France's data protection authority";

/**
 * Who receives what, why and on what basis, who sends it, from where, under what safeguard and for how long it is kept, what the
 * host sees and keeps, then where to see, correct, delete or object, and who else hears a complaint. The basis, the safeguard,
 * the host's logs and the CNIL are the user's answers to N1's questions (Q8).
 */
export const PRIVACY_NOTICE: TextFile = [
  [
    "Jellycat Studio receives your name, email and message to answer you. ",
    "The legal basis is the studio's interest in answering messages sent to it. ",
    `${PROCESSOR}, a US company, sends them from ${SENDING_REGION} and keeps them ${RETENTION_DAYS} days in the US, `,
    `under ${SAFEGUARD}. `,
    "The studio's inbox keeps them while the exchange lasts. ",
    `${HOST}, which hosts this site, sees each request's IP address and keeps the site's logs ${HOST_LOG_DAYS} days.`,
  ],
  ["To see, correct or delete your data, or to object to its use, write to ", email, `. You can also complain to ${AUTHORITY}.`],
];
