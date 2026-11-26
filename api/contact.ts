// POST /api/contact: the contact form's function (Vercel makes one of every file in api/; this is the only one). The work is
// in app/core/contact-handler.ts; this file hands it the key from the deployment's environment and the platform's fetch, and
// writes its one log line. The `.js` is what the build writes: Node resolves no relative import without its extension.

import { type ContactLog, handleContact } from "../app/core/contact-handler.js";

export default {
  fetch(request: Request): Promise<Response> {
    return handleContact(request, {
      apiKey: process.env.RESEND_API_KEY,
      fetch,
      log: (entry: ContactLog) => console.log(JSON.stringify({ route: "contact", ...entry })),
    });
  },
};
