# Phase 2: make it alive

Phase 2 of [plan.md](plan.md), split into tasks: the Lab (a Gero program running on `gero.wasm`), a contact form that relays to
an inbox, link preview images, and sound. Each task is one child session in its own worktree and branch, and lands as one
reviewed commit or a short series on the release branch `phase-2`, which reaches `main` once, at the end
([the release branch](#the-release-branch)). The mockup is [`mockups/phase-2.html`](../mockups/phase-2.html): the Lab's window
(`#d-lab`), the contact form on both layouts (`#d-contact`, `#p-contact`), Special's and the Control Panel's Sound (`#d-panel`,
`#p-sheet`), the phone's home below the folders (`#p-home`), and two link preview images (`#og-hundo`, `#og-home`); its shots at
1:1 are in `.cache/phase2/`. The user answered its questions on 22 Nov 2026 ([the answers](#the-users-answers)); once Phase 2 is
on `main`, the decisions move into [plan.md](plan.md) and [design.md](design.md) and this file stays as the record, as
[phase-1.md](phase-1.md) and [phone-plan.md](phone-plan.md) do.

Everything said here about Gero and gero-lab was read from their repositories on 21 Nov 2026 (gero at `93ae88d`, release v0.5.5;
gero-lab at `2f008b3`) and checked by running the module.

## What the Lab loads

- **The module.** `gero.wasm`, the whole toolchain (assemble, compile, run, step, disassemble) built `ReleaseSmall` for
  `wasm32-freestanding` by `zig build wasm` (gero's `build.zig`, `docs/wasm.md` §9.2). gero publishes it as a loose asset of
  each release, beside `samples.json`, "since a browser host fetches them by URL and cannot unpack an archive".
- **The version.** v0.5.5 is gero's latest release (21 Sep 2026). Its `gero.wasm` is 1,054,038 bytes, 269,384 gzipped
  (`gzip -9`); `samples.json` is 12,776 bytes. SHA-256: `284443e8d751866bac5b12d3e0c8ac626821f8ee4bccf7b85e29b0d1653e4c06` and
  `2344c24f1ccf394c7a26feee6180ad33810105529fa5ff60fc09d1fa9f6abe7f`. The module reports itself as `0.5.5` (`gero_version`).
- **How gero-lab gets it.** Fetched at build, never vendored: its `scripts/fetch-assets.mjs` downloads
  `https://github.com/salty-max/gero/releases/download/<GERO_TAG>/gero.wasm` (and `samples.json`, `books.json`) into a
  gitignored `public/`, and its worker fetches `/gero.wasm` from its own origin at run time. "Pinning a tag rather than tracking
  `main` is the point" (its README). Its production pins an older tag: `gero-lab.vercel.app/gero.wasm` is v0.3.0 (1,025,501 bytes,
  251,701 with brotli), served with `access-control-allow-origin: *` and `cache-control: public, max-age=0, must-revalidate`.
- **How it is driven.** `WebAssembly.instantiate(bytes, {})`: no imports at all. The host writes sources into a bump arena
  (`gero_alloc`, `gero_file_put`), builds (`gero_compile` for `.gr`, `gero_assemble` for `.gas`), loads the image into a VM
  handle (`gero_vm_create`, `gero_vm_load`), retires instructions in slices (`gero_vm_step(handle, budget)`) and drains what the
  program printed (`gero_vm_take_output`). A result is five little-endian `u32`s; a pointer is an offset from `gero_arena_base()`.
  Diagnostics come back as JSON (`file`, `line`, `column`, `severity`, `code`, `message`), the same wording as `gero check`.
  gero-lab's binding (`src/worker/module.ts`, about 340 lines) is the reference; both repositories are MIT.
- **What it runs.** `samples.json` holds twelve programs from gero's own `examples/`, gated by gero's CI against `.expected`
  files: five in assembly (`banks`, `counter`, `fib`, `hello`, `save`) and seven in Gero (`collatz`, `factorial`, `fibonacci`,
  `fizzbuzz`, `gcd`, `rock_paper_scissors`, `shapes`). Run through the v0.5.5 module in Node, every one builds and halts: the
  slowest build took 8 ms (`collatz`, the first compile), the longest run 6,812 instructions; `fizzbuzz` prints `1` to `FizzBuzz`
  in 1,076. There is no input: the peripherals a game needs (display, audio, input) are gtx-16's, not the module's (`wasm.md`).
- **Memory.** `gero_init(0)` takes the default arena (a 16 MiB limit); the module's linear memory is then 23.4 MB.

## Decisions this plan adds

- **Phase 2 reaches production once, from the release branch `phase-2`** (Q9). Every task lands on `phase-2`; `main`, and so
  jellycat.fr, gets all of it in one fast-forward after F1, on one go from the user. [The release branch](#the-release-branch)
  says how.
- **The Lab is a desktop window only** (Q6). No `/lab` page and no address: the window opens from its icon, Jelly HD or the
  Terminal, on whatever page the desktop is. The phone's home page gets a Lab section below the folders with one card, a link to
  Gero Lab (`gero-lab.vercel.app`), gero's own playground in the browser.
- **The Lab loads a same-origin copy of the module, fetched at build from a pinned gero release and checked against a pinned
  SHA-256.**
  - The way gero-lab does it (a release tag, fetched at build, gitignored, never vendored), plus the hash gero-lab lacks: a
    release asset can be replaced, and the build fails on a mismatch rather than shipping a different module.
  - `app/lab/gero.ts` holds the pin (tag, the two file names, the two hashes); `scripts/gero-assets.mjs` reads it, downloads
    into `.cache/gero/` once, checks the hashes, and copies into `public/gero/` (gitignored) as `gero-0.5.5.wasm` and
    `samples-0.5.5.json`, removing any older pin's files there. The version in the name makes each file immutable, so
    `vercel.json` caches `/gero/*` for a year, as it does `/assets/*`. Moving to a new gero release is one edit to the pin and a
    review of what the Lab shows.
  - Everything that needs the files runs the script first: `build`, `check` and `dev` in `package.json`, Vitest's `globalSetup`
    (CI's check job runs `lint`, `typecheck`, `test` and `build` as separate steps, and pnpm runs no `pre` scripts), and CI's
    jobs, with `.cache/gero/` cached on the pin. So CI and Vercel need GitHub reachable at build, as gero-lab's deploy does. A
    missing or wrong asset fails loudly. Stories don't need it: they draw the Lab's states from props.
  - Not a cross-origin fetch from gero-lab: it serves v0.3.0 today, moves whenever gero-lab deploys (a module the Lab's binding
    was not written against), and would add `connect-src https://gero-lab.vercel.app` and a second origin every visitor's
    browser talks to. GitHub's release URLs redirect to a download host that a page can't fetch from.
- **No worker.** gero-lab runs the VM in a worker for its debugger. Here every sample builds and runs in milliseconds, so the Lab
  runs on the main thread in slices: steps of 10,000 instructions until about 8 ms have gone, then a yield to the browser, Stop
  between any two slices, and a cap of 10,000,000 instructions a run (`stopped after 10000000 steps`), so a loop typed in the
  editor can't freeze the page. The output pane keeps the last 64 KB and says when it cut (`output cut to the last 64 KB`), so a
  program printing in a loop can't fill the page either. A build isn't sliced (it is one call); a trap from the module (a
  `RuntimeError`, say a stack overflow on deeply nested code, not seen) prints `gero.wasm stopped: <message>` and the next Run
  starts a fresh instance. One chunk fewer than a worker, and no question of which policy a worker runs under.
- **CSP: `'wasm-unsafe-eval'` joins `script-src` on every page.** Compiling WebAssembly needs it (Chrome 97, Firefox 102 and
  Safari 16 accept it; Safari's is not verified here). It allows WebAssembly and nothing else: no `eval`, no inline script. Every
  page: the desktop opens the Lab on any of them, and the site moves between pages in the browser, so the policy in force is the
  first page's. `connect-src 'self'` already covers fetching the module.
- **The contact form is a page with an address, as projects are** (Q6). `/contact` is prerendered, in the sitemap, with its title,
  description and preview image. On a phone it is a page, linked from a Contact section below the folders; on the desktop the
  address opens the Contact window over Projects, as `/projects/<slug>` opens an Info window, and closing it goes back to `/`.
  Moving to another address closes Info windows only, as today: the Contact window and the Lab stay open with what they hold (a
  half-typed message, an edited program). One module, `app/core/pages.ts`, lists every page with its title and description, and
  the meta, the prerender list, the sitemap and the preview images all read it.
- **No `~/lab` directory in the shell.** phase-1.md promised a `gero` command and a `lab` directory with the Lab. The command
  stays (`gero` opens the Lab, `gero run <program>` opens it on that program and runs it). The directory goes: the programs
  arrive with the module, and the shell's file system is built synchronously from the data, before anything is fetched.
- **The contact form posts to a function in the same Vercel project, which sends one e-mail through Resend and keeps nothing**
  (Q1, Q2). `api/contact.ts` beside the static site, same origin: the CSP doesn't change (`connect-src 'self'`,
  `form-action 'self'` already allow it). It only ever writes to the studio's own address (`CONTACT_EMAIL` in
  `app/core/studio.ts`, max@jellycat.fr), from contact@jellycat.fr, with the visitor's address as `Reply-To`, so it can't be used
  to mail anyone else.
- **The form carries a privacy notice** (Q8): who collects, why, Resend as the processor and where it is, how long, the visitor's
  rights and where to write. An Opus pass words it (N1) and the user approves the words before the form ships.
- **Link preview images are drawn at build, one per page, with satori and sharp.** sharp is already here; its own text
  rendering (Pango) fell back to a sans-serif when given VT323's woff (probed on 21 Nov 2026: Fontconfig can't load it), so the
  type goes through satori, which takes the woff and draws each glyph as a path. One new build-time dependency.
- **Sound is generated in the browser, off by default, and never starts an `AudioContext` before a gesture** (Q7). Oscillators
  and gain envelopes, no audio files. An `AudioContext` made at load logs a warning in Chrome and plays nothing anyway; it is made
  on the click that turns sound on, or on the first click or key after a reload with sound saved on.
- **Each feature brings its own gates.** The tasks that add a page or a window also add it to both Lighthouse configs, the axe and
  aria tests and the keyboard walk, so `phase-2` is checked as it grows and F1 is a sweep and the release's review, not the first
  look.

## The release branch

The user chose to ship Phase 2 all at once (Q9). What changes against Phase 1's rule ("each task lands as one reviewed commit or a
short series, pushed to `main` on the user's go"):

| | Phase 1 | Phase 2 |
| --- | --- | --- |
| A child cuts its branch from | `main` | `origin/phase-2` |
| "After" means the task is on | `main` | `phase-2` |
| A task's push, on the user's go | to `main`, which deploys production | to `phase-2`, which deploys a preview |
| CI runs on | each push to `main` | pushes to `phase-2`, through a draft pull request into `main` |
| Production changes | at every task | once, when `phase-2` fast-forwards `main` |
| Reviews | one per task | one per task, and one over the whole phase before the merge |

**B0, before wave 1** (the opener, on the user's go): once this plan's commit is on `main`, `git fetch origin`, then create
`phase-2` on origin from exactly that commit: `git push origin origin/main:refs/heads/phase-2`.

**The draft pull request, after the first task lands** (the opener, on the user's go): GitHub refuses a pull request with no
commits between its branches, so it is opened right after the first push to `phase-2`, from `phase-2` into `main`, titled
`Phase 2`, linking this file. CI runs on pull requests (`ci.yml` has no other trigger but `main`), so its `opened` event and every
later push to `phase-2` run the check, the e2e tests and both Lighthouse configs, with no change to `ci.yml`. `ci.yml` cancels a
pull request's running build when a newer push arrives: two tasks landing close together get one verdict, on the later tree,
which holds both. Nobody merges it on GitHub: the fast-forward at the end closes it as merged.

**A task's way onto `phase-2`:**
- The child's worktree is cut from `origin/phase-2` (the opener's `start_session` names it as the source branch).
- The child works as in Phase 1: the check through q, the packet, the reviewer, `review.ts`, one commit or a short series on its
  own branch; it reports what a push would send (`phase-2`, the range).
- On the user's go, the push is `git push origin HEAD:phase-2`, a fast-forward, never forced. The pre-push gate holds for
  `phase-2` as for any branch: a passing check on the tree, and a review whose packet starts at what `phase-2` already has.
- When `phase-2` moved since the child's cut (another task landed), the child rebases on `origin/phase-2` first, runs the check
  again (the tree is new, so its stamp is too), and makes a packet over the rebased range for the reviewer, since the gate ties a
  review to its exact tree. Tasks that run at the same time keep to their own files, so that read is short.
- A card is `done` once its work is on `phase-2`. F1's card carries the release to `main`.

**Previews.** Every push to `phase-2` makes a Vercel preview of the integrated work, at the branch's own preview address (Vercel
names it after the project, the branch and the team; the opener reads it off the deployment). Its environment is Vercel's
Preview one: `RESEND_API_KEY` for Preview is scoped to the `phase-2` branch (U1), so the form can send from that preview and
from no other. On the Pro plan, previews may sit behind Vercel's deployment protection (a Vercel login): fine for the user, but
a link-preview debugger can't read through it, so the preview images' check with Facebook's and X's debuggers runs on production
after the merge. C1's early preview (Q10) is the one exception to "previews come from `phase-2`": C1 pushes its own branch first.
Once those commits are on a remote ref, a later packet would start at that branch's tip, which `phase-2` doesn't have, so C1's
last packet names its range, `origin/phase-2..HEAD`; the preview branch is deleted on origin afterwards, on a go.

**Deployment protection.** On Pro, previews may require a Vercel login, and a request from `curl` or another origin then gets
Vercel's `401` before it reaches the function. U1 says whether previews are protected. If they are, the user creates a
Protection Bypass for Automation secret and gives it to the probing session as an environment variable (never written to a
file); the probes send it as `x-vercel-protection-bypass`.

**`main` while Phase 2 runs.** A fix that can't wait goes to `main` as before. The opener then brings `main` into `phase-2` with
a merge commit (`chore: main into phase-2`), checked and reviewed like any task, on the user's go. Without such fixes, `main`
doesn't move and the end is a fast-forward.

**The merge, at the end** (after F1):
- F1 runs on `phase-2`'s tip: `pnpm check`, `pnpm e2e`, both Lighthouse configs, the walk on the preview.
- The release review. The pre-push gate counts, for a push to `main`, only a review whose packet starts at what `main` already
  has, and the tip's own verdict (its last task's) started on `phase-2`. So in a worktree at the tip, after `git fetch origin`:
  `bun harness/packet.ts jellycat origin/main..HEAD`, the reviewer reads it (the whole phase), then
  `bun harness/review.ts jellycat --again "<verdict>"` (`--again`, since the tree already has a verdict). F1 reports the tip's sha.
- One go from the user. The opener runs `git fetch origin` and pushes exactly that sha as a fast-forward:
  `git push origin <sha>:refs/heads/main` (no local `phase-2` is needed, and none can be stale).
- If `main` moved meanwhile, it comes into `phase-2` first, in this order, since one tree holds one review and no single packet
  starts on both branches once they have split:
  1. the merge committed (`chore: main into phase-2`), a packet over `origin/phase-2..HEAD`, the reviewer, its review recorded;
  2. the check through q, the push to `phase-2` on the user's go, and the pull request's CI on that tree;
  3. the release packet over `origin/main..HEAD`, the reviewer, `review.ts --again` (after step 1's verdict was recorded);
  4. F1 reports the new sha, and the push to `main` above.
- CI runs on `main`'s push (the same tree the pull request checked); Vercel deploys production. F1 then probes production: the
  headers (CSP with `'wasm-unsafe-eval'`, `frame-ancestors`), `/contact`, `/api/contact` (a `403` from another origin), the
  sitemap, `/og/*.png`, and the link-preview debuggers.
- `phase-2` is deleted on origin afterwards, on the user's go.

## The four features

### The Lab

**Desktop.** A `Lab` icon (a new 1-bit flask, drawn on the 16×16 grid) in the icon column under Terminal, and `Lab` in Jelly HD as
an Application. It opens the `Lab` window, 532×432:

- The info line: the program's file name on the left (`fizzbuzz.gr`), `gero 0.5.5` on the right (from the module, which a test
  holds to the pin).
- A row: the program picker (a button showing the file name, opening a menu drawn like the menu bar's: Gero's seven, a
  separator, the assembly five), then Reset and Run, the default button. Ctrl+Enter (⌘+Enter) runs from the editor.
- The editor (Q5): a `textarea` with the program's text, VT323 18px, no wrapping, the 1-bit scroll bars; spellcheck,
  autocorrect and autocapitalize off. Tab leaves it, as Tab leaves every field (indent with spaces), so the keyboard can always
  get out. An edit lasts while the window is open, whatever page the desktop moves to.
- `Output`, dim, with the run's state at the right (`halted, 1076 steps`, `stopped after 10000000 steps`, `faulted at $0123`),
  then the output pane, which keeps its end in view. A build that fails prints its diagnostics there as `gero check` words them:
  `error: expected expression [E_SYNTAX_MISSING_TOKEN]` then `--> fizzbuzz.gr:4:1`.
- While it runs, Run becomes Stop. The window fetches the programs (`/gero/samples-0.5.5.json`, 12.7 KB) when it opens and the
  module (about 270 KB over the wire) on the first Run (`loading gero.wasm`), each once a page load. A failed fetch says
  `could not load gero.wasm` (or `could not load the programs`), and the next try fetches again.

**Terminal.** `gero` opens the Lab and prints `opened Lab`; `gero run fizzbuzz` opens it on that program and runs it; an unknown
program prints `gero: no program named foo`, and `gero help` lists the twelve. (L4, after the window exists.)

**Phone.** No Lab (Q6). The home page's Lab section, below the folders, has its title bar in inverse video like a folder's (the
flask inverted) and one card: `Gero Lab`, its address dim (`gero-lab.vercel.app`), and gero-lab's own line, `Browser playground
for the Gero VM.` (its README's first line). The card's name links to `https://gero-lab.vercel.app` in a new tab, as every https
link on the site does; its hit area is the whole card.

**Needs.** The pin and the fetch script; a typed binding over the module (a port of gero-lab's `module.ts`, the parts the Lab
calls); the sliced run loop; a hook (`useGero`: programs, module, build, run, stop, state); the window, the icon, the phone's
card. No account, no secret, no server.

**CSP and privacy.** `'wasm-unsafe-eval'` as above. Both files come from the site itself; nothing is stored (the edit lives in
memory, not in `localStorage`).

**Accessibility.**
- The editor is a labelled `textarea` (`Program`); the picker a Base UI menu like the menu bar's, ↑ ↓ Enter Esc.
- The output pane is a `log` with `aria-live="off"`, so a program printing a thousand lines doesn't flood a screen reader; the
  state line is a polite `status` that says `halted, 1076 steps` once.
- Run, Stop and Reset are buttons; Stop takes the focus while it runs and gives it back to Run.
- No motion: the output appears as it comes, with no typing effect.

**Lighthouse.** Nothing changes on any page: the Lab's code is a chunk of the desktop's own, loaded when the window opens, and the
module only on Run. The phone's card is a few lines of markup on the home page.

**Tests.**
- Unit, against the real module in `.cache/gero/` (as gero-lab's tests drive the real one, no mock): every sample builds and
  halts with its `.expected` output; a broken program's diagnostics; the step cap; Stop between slices; the 64 KB cut; a trap and
  the fresh instance after it; `gero_version` equals the pin.
- The fetch script: a wrong hash fails, a cached file isn't fetched again, an older pin's files go.
- Component tests with user-event; stories for the window (before, during, after a run, a build error) and the phone's card under
  each phosphor.
- e2e on the desktop: open the Lab, Run `fizzbuzz`, see `FizzBuzz` and `halted, 1076 steps`; break the program and read the
  diagnostic; move to a project and back and find the edit still there; `csp.spec.ts` runs a program and expects no violation;
  axe and the keyboard walk with the window open. On the phone: the card and its link.

### The contact form

**Desktop.** A `Contact` icon (a new 1-bit envelope) under Lab, and `Contact` in Jelly HD; `/contact` opens it too. The `Contact`
window, 380×370: `To` and `max@jellycat.fr` (text, not a field), then Name, Email and Message, the privacy notice in the dim tone
(scrolling with the 1-bit scroll bar if it is longer than its box), and Send, the default button. The state shows beside Send:
`Sending...`, `Message sent.`, or `Could not send the message. Write to max@jellycat.fr.` with the address as a link. The Readme
and `contact.txt` keep the address.

**Phone.** A `Contact` section under the Lab's on the home page (the envelope inverted), one card linking to `/contact`, with the
line `A message from this page goes by email to max@jellycat.fr.` (proposed). The `/contact` page: `Contact` as the `h1`, the Email
and GitHub rows as on the home page, then the form: each label above its field, fields 44px tall with 20px text (iOS zooms into
anything under 16px), Message six lines, the line about the e-mail, the privacy notice, Send the column's width (56px, the hard
shadow), the state under it.

**The form.**
- Name (up to 100 characters), Email (`type="email"`, up to 254), Message (1 to 5,000), all required; the browser's own
  validation, then the same limits on the server (`app/core/contact.ts`, imported by both).
- A honeypot: a field off screen, `tabindex="-1"`, `autocomplete="off"`, its wrapper `aria-hidden`, under a name no browser's
  autofill knows (not `website`, `url` or `company`, which autofill may fill for a real visitor, who would then see a false
  `Message sent.`). Filled, the server answers as if it sent and sends nothing.
- The form also sends how long it was open. Under two seconds, the server refuses it and the visitor sees why
  (`Could not send the message. Try again.`), never a false success: a fast autofill is a person too.
- It needs JavaScript (it posts with `fetch`). Without it, the address is on the page as a link.
- Errors are announced: the state line is a polite `status`, a field the server refuses gets `aria-invalid` and its message
  linked with `aria-describedby`, and the focus goes to the first field in error.

**The function.** A Vercel Function in this project (Web `Request`/`Response`, no framework). Vercel makes a function of every
file in `api/` but those starting with `_` or `.`, so `api/contact.ts` is the only file there: a thin wrapper around the handler,
which lives in `app/core/contact-handler.ts` with its test. With `"type": "module"`, a relative import without its extension
builds and then fails at run time (`ERR_MODULE_NOT_FOUND`, reported for this setup), so the wrapper imports
`../app/core/contact-handler.js`. The handler:
- accepts `POST` with JSON only, a body up to 16 KB, and an `Origin` equal to the request's own host (`https://<Host>`): the
  site, the vercel.app alias, a preview and a branch's preview all pass, another site's page doesn't;
- validates with `app/core/contact.ts`; strips line breaks from the name before it goes in the subject;
- sends one plain-text e-mail through Resend's HTTP API with `fetch` (no SDK): to `CONTACT_EMAIL`, from contact@jellycat.fr,
  `Reply-To` the visitor, subject `jellycat.fr: <name>`;
- answers `{ "ok": true }`, or `400` with the fields in error, `403`, `413`, `502` when Resend refuses, and `503` when its key
  isn't set (a deployment without it says so instead of pretending);
- logs the outcome and the status code, never the message, the name or the address.

**The provider** (Q1: a Vercel Function and Resend). Free at this volume: 100 e-mails a day, 3,000 a month, 3 domains; Resend keeps
sent e-mails 30 days on that plan (its pricing page). jellycat.fr's DNS is at Gandi (its `NS`) and so is its mail (`MX 10
spool.mail.gandi.net` and `50 fb.mail.gandi.net`); the apex has no SPF record and DMARC is `p=none`. Resend's records go on Gandi: a
DKIM `TXT`, and a `MX` and SPF `TXT` on a `send` subdomain for bounces, so the apex `MX`, and the mailbox, stay as they are. Resend
sends from the region chosen when the domain is added (North Virginia, Ireland, São Paulo or Tokyo; its regions page says the other
three may need a paid plan, its changelog that free accounts once had the US only: U1 sees which its plan offers); the account's
data stays in the United States either way. The options not taken, for the record: the same function through Gandi's SMTP (the
mailbox's password in Vercel); Cloudflare Email Service (the domain's DNS and mail moved off Gandi for one form); a form relay such
as Formspree or Web3Forms (a third party keeping every message).

**Spam** (Q3). The function only ever writes to the studio, so the risk is a flooded inbox, not a relay for spam:
- the honeypot and the two seconds;
- the server's validation and its `Origin` check;
- a Vercel Firewall rate-limit rule on `/api/contact`, 5 requests per 10 minutes per IP (the team is on Pro);
- Resend's quota as the last stop.

No Turnstile to start with: it is a third-party script and an iframe drawn in its own colours (against the one-phosphor rule), it
needs a Cloudflare account and widget keys, and the CSP would add `script-src` and `frame-src https://challenges.cloudflare.com`.
It stays the next step if spam gets through.

**Privacy.** Nothing goes to `localStorage`; Vercel's runtime logs hold the status code only; Resend is the processor and keeps the
e-mail 30 days; the inbox keeps the message. The notice (Q8, N1's words, approved by the user) says so where the visitor writes:
on `/contact` and in the window. (Not legal advice.)

**Lighthouse.** C2 adds `/contact` to both configs. Labels on every field, 44px targets, no third-party script.

**Tests.**
- Unit: `app/core/contact.ts`'s limits; the handler with a fake `fetch` (each status, the honeypot, the two seconds, the `Origin`
  against the host, no key, a Resend error, the name's line breaks, nothing logged but the status).
- Component tests (the states, the focus on error); stories under each phosphor.
- e2e on both projects with `/api/contact` stubbed by Playwright (`scripts/serve.mjs` serves files only): send, the sent state,
  a refused field, a network error; the keyboard alone; axe and aria over the window and the page.
- On deployments: C1's own preview proves the function builds and answers (a `503` with no key, a `403` from another origin);
  `phase-2`'s preview sends a real message once U1 set the Preview key; production's after the merge.

### Link preview images

- **One per page:** the home page, each of the 19 projects and `/contact`: 21 PNGs, 1200×630 (the size Open Graph and X's
  `summary_large_image` both take), written by `buildEnd` to `build/client/og/`: `og/index.png`, `og/projects/<slug>.png`,
  `og/contact.png`. PNG, not JPEG, and a 16-colour palette (sharp's `palette`): one phosphor and its glow need no more, and text
  stays sharp. Measured on Chrome's shots of the mockup's two frames: 26.8 and 24.9 KB, against 111 and 102 KB in full colour;
  O1 confirms it on satori's own output with its first image, before the other 20.
- **The look** (`#og-hundo` and `#og-home`): the tube's black, green phosphor (the default; a preview has no settings), the glow,
  and the scanlines baked in at twice the screen's pitch (2px every 6px), so a preview shown at half size still has them; no
  vignette (it darkens the corners a small preview crops). A menu-bar strip across the top with the cat and `Jellycat Studio`;
  the page's name large (a project's name, `Contact`), its kind dim, its description up to three lines, cut with `...`; the page's
  address dim at the bottom left (`jellycat.fr/projects/hundo`) and `Jelly-OS 1.0` at the bottom right. The home page's:
  `Jellycat Studio` large, the studio's line, and the four folders as framed tabs with their counts, as the phone's home shows
  them. Words from `pages.ts`, `projects.ts`, `studio.ts` and `site.ts`.
- **The tags**, from `pageMeta` in `app/core/site.ts`: `og:image` (absolute, on `SITE_URL`), `og:image:width`, `og:image:height`,
  `og:image:type`, `og:image:alt` (the page's title), `og:type` `website`, `og:site_name` `Jellycat Studio`, and
  `twitter:card` `summary_large_image` (X reads the `og:` tags for the rest).
- **How:** `scripts/og.ts`, called from `buildEnd` before the CSP step: satori lays each image out from a plain object tree (no
  JSX in scripts) with VT323's woff, sharp turns the SVG into a PNG. The cat comes from `app/os/icons/grids.ts`. A cold build adds
  a few seconds for 21 images.
- **Size:** each under 60 KB, checked by the test.
- **CSP and privacy:** none; crawlers fetch them. **Lighthouse:** none (no audit reads `og:image`).
- **Tests:** unit for the layout's line cutting; a build test that every page's `og:image` names a file in `build/client` that
  is a 1200×630 PNG under 60 KB; three of them looked at 1:1 against the mockup; the debuggers on production after the merge.

### Sound

- **Generated in the browser.** Square and triangle oscillators with short gain envelopes, in `app/os/sound/`: no audio files,
  no samples from Apple, Microsoft or any game, nothing fetched. No `AudioWorklet` (it would be a script for the CSP).
- **Off by default, persisted per browser.** `sound: boolean` in the settings store, saved under `jelly-os:settings` with the
  phosphor (`partialize` gains it). The store's version stays 1: `sanitize` already drops unknown keys and leaves a missing one at
  its default, so a saved state from before reads as off. It is not a `data-*` attribute and the head script doesn't read it:
  nothing about it is visible at first paint.
- **Where it's switched on:**
  - the desktop's Control Panel: a fourth row, `Sound`, with one checkbox, `On` (the window grows from 400×170 to 400×196);
  - Special in the menu bar: `Sound`, a check item after Dither pattern;
  - the phone's sheet: the same `Sound` row under Effects, 44px tall.
  One component (`SoundSetting` in `app/os/controls/settings-controls.tsx`) serves the Control Panel and the sheet.
- **What makes sound** (Q7):
  - the alert's beep when a dialog appears (About, Shut Down...);
  - a short click when a window opens and a lower one when it closes;
  - a rising tone on Restart's boot and a falling one on Shut Down;
  - on the phone, a click when the sheet or the viewer opens and closes.
  Never autoplaying: every sound follows a click or a key, and the first page load is silent whatever is saved.
- **The `AudioContext`:** made on the click that turns sound on (the checkbox plays a click as it turns on), or on the first
  click or key after a reload with sound saved on; then kept and suspended when sound goes off. Where Safari has
  `navigator.audioSession`, its type is `ambient`, so the ring/silent switch mutes it and it never stops the visitor's music.
  The sound code is a chunk of its own, loaded once sound is on. The gesture listener mounts in `app/root.tsx` beside
  `useSettingsSync` (a few lines, the chunk loaded only when needed); the windows' clicks come from a subscriber in the desktop's
  `window-layer.tsx`, which the desktop chunk already holds, so the window store never reaches a phone.
- **Accessibility:** a sound never carries meaning on its own (every one doubles something on screen); off by default, so it
  never talks over a screen reader unasked; one fixed, moderate level. Reduced motion doesn't touch it (it isn't motion).
- **CSP and privacy:** none. **Lighthouse:** none, as long as nothing makes an `AudioContext` at load (a test holds it).
- **Tests:** unit with a fake `AudioContext` (jsdom has none): nothing is made at load, nothing plays while off, the checkbox
  makes and resumes it, each cue schedules its notes; stories with the Sound row; e2e: an init script counts `AudioContext`s,
  none after a load with sound saved on, one after the first click; the setting holds after a reload.

## The tasks

"After" names the tasks that must be on `phase-2` first. Effort is the child's reasoning effort. Every task: its child cut from
`origin/phase-2`, `bun harness/q.ts check -- bun run check`, `pnpm e2e` when a page or window changes, a visual task compared at
1:1 with `mockups/phase-2.html` (`node scripts/look.mjs --mockup phase-2.html --selector "#d-lab" --size 652x480`; the phone's
frames at 412x839), a difference from `docs/design.md` changing it in the same commit, the packet and the reviewer before the
commit, and the push to `phase-2` on the user's go. Accounts, keys, DNS records and Vercel settings are the user's (U1): no child
creates one.

| ID  | Task                                | Kind     | Model  | Effort | After                     |
| --- | ----------------------------------- | -------- | ------ | ------ | ------------------------- |
| B0  | `phase-2` (the PR after a push)     | ops      | opener | -      | this plan on `main`       |
| U1  | Accounts, DNS and secrets           | ops      | user   | -      | -                         |
| X1  | `look.mjs` shows scroll bars        | code     | Sonnet | medium | B0                        |
| N1  | The privacy notice's words          | prose    | Opus   | high   | B0                        |
| R1  | Pages and windows by address        | code     | Opus   | high   | B0                        |
| G1  | Gero's module: pin, fetch, run      | code     | Sonnet | high   | B0                        |
| C1  | The contact function                | security | Opus   | high   | B0                        |
| S1  | Sound                               | code     | Sonnet | high   | B0                        |
| L2  | The Lab window and the phone's card | code     | Sonnet | high   | R1, G1, X1                |
| C2  | The contact form, both layouts      | code     | Sonnet | high   | R1, C1, X1, N1 approved   |
| O1  | Link preview images                 | code     | Sonnet | high   | R1                        |
| L4  | `gero` in the Terminal              | code     | Sonnet | medium | L2                        |
| F1  | The sweep, the release review       | code     | Opus   | high   | all above, U1             |
| M   | `phase-2` into `main`               | ops      | opener | -      | F1, the user's go         |

**What runs at the same time.**

0. B0 (the opener); the user starts U1 whenever they like.
1. X1, N1, R1, G1, C1 and S1. C1 pushes its own branch for a preview before it lands (Q10).
2. L2, C2 and O1.
3. L4.
4. F1.
5. M: the merge to `main`.

The critical path is B0 → R1 → L2 → L4 → F1 → M; the form's is C1 (and its preview) and N1 (and the user's approval) → C2 → F1.

**Who owns what in a wave.** Wave 1's tasks share no file: X1 `scripts/look.mjs` and README Scripts; N1 `app/core/privacy.ts`; R1
the address plumbing; G1 `app/lab/`, the build, CI, `vercel.json` and README Build and Layout; C1 the function, `tsconfig.json`,
`eslint.config.js` and README Hosting; S1 the settings, `app/os/sound/`, the controls, the menus, the dialogs, `window-layer.tsx`,
`app/root.tsx`, `launch.ts` (the Control Panel's size) and design.md's Sound section. In wave 2, L2 and C2 both add one line each to
these registries, where a rebase conflict goes to the later task: `app/os/desktop/registry.ts`, `app/os/desktop/apps/launch.ts`,
`app/os/desktop/apps/folder-model.ts` (Jelly HD), `app/os/desktop/surface/desktop-icons.ts`, `app/os/icons/grids.ts`,
`app/os/phone/home-sections.ts` (the sections below the folders, R1's), `e2e/axe.spec.ts`, `e2e/aria.spec.ts`,
`e2e/keyboard.spec.ts`, and a section each in `docs/design.md`. C2 alone adds to `app/routes.ts`, `app/core/pages.ts`,
`app/os/desktop/apps/page-windows.ts` and the Lighthouse configs; O1 alone touches `package.json`, `react-router.config.ts`,
`app/core/site.ts` and `e2e/pages.spec.ts` (after R1 made it read `pages.ts`). README is edited section by section.

### B0 `phase-2` (the opener)

On the user's go, once this plan's commit is on `main`: `git fetch origin`, `git push origin origin/main:refs/heads/phase-2`.
Every child after it is cut from `origin/phase-2`. After the first task's push to `phase-2`, on the user's go, the draft pull
request into `main` ([the release branch](#the-release-branch)).

### U1 Accounts, DNS and secrets (the user's)

Done by the user, in this order:
- the Vercel Firewall rule on `/api/contact` (5 requests per 10 minutes per IP), first, so the endpoint is limited before it can
  send;
- a Resend account; `jellycat.fr` added as a domain there, in the sending region the user picks (Ireland, `eu-west-1`, if the
  plan offers it, keeps the sending in the EU; the region can't be changed later without adding the domain again);
- the records Resend shows, added in Gandi's DNS (a DKIM `TXT`, the `send` subdomain's `MX` and SPF `TXT`); verified in Resend;
- an API key with sending access to that domain only, set in the Vercel project as `RESEND_API_KEY` for Preview, scoped to the
  `phase-2` branch, and for Production;
- whether previews are behind deployment protection, and if so a Protection Bypass for Automation secret for the probes.

A child never creates an account, a key or a record, and never changes the Vercel project. F1 waits for U1: the merge needs the
Production key, so the form never meets visitors without a way to send.

### X1 `look.mjs` shows scroll bars (code)

**Delivers** `scripts/look.mjs` launching Chrome without Playwright's default `--hide-scrollbars` (`ignoreDefaultArgs`), so a look
shows the 1-bit scroll bars `docs/design.md` describes; one look at the Readme window to see it. Found while shooting this plan's
mockup: no look so far has shown a scroll bar.

**Files:** `scripts/look.mjs`, README Scripts (one line).

### N1 The privacy notice's words (prose, Opus)

**Delivers** `app/core/privacy.ts`: the notice as lines of spans, like `studio.ts`'s files (the address a link). It says, in the
site's plain words: Jellycat Studio collects the name, the address and the message to answer it; Resend, a company in the United
States, sends it from the region U1 picked and keeps it 30 days; the inbox keeps it as long as the exchange lasts; the visitor can
ask to see, correct or delete it at max@jellycat.fr. Facts only, no legal boilerplate beyond those, five lines or so at the phone's
width. A unit test: no em dash, the address from `CONTACT_EMAIL`, the processor and the 30 days present.

**Ends with** the text sent to the opener, which asks the user to approve it (Q8). The region comes from U1 through the opener;
until U1 has picked it, the notice names it as a placeholder that says so, and the approval waits. C2 waits for that approval.

**Files:** `app/core/privacy.ts` and its test.

### R1 Pages and windows by address (code, Opus)

**Delivers** the plumbing the contact form and later pages need, with no visible change:
- `app/core/pages.ts`: every page with its path, title and description (the home page and the projects today), which the routes'
  `meta`, `react-router.config.ts`'s prerender list and sitemap read. O1 reads it for the images; C2 adds `/contact`.
- The OS route's handle names its page (`{ os: true, page: "home" | "project" | "contact" }`); `app/os/layout.tsx` hands both
  layouts the page and its route's loader data, whatever its shape, instead of a slug and `blocks`.
- The desktop: `app/os/desktop/apps/page-windows.ts` maps a page to the window it opens (a project's Info today; C2 adds Contact).
  The address opens that window over Projects, back and forward bring it to the front, and closing the window the address names
  goes back to `/`. A move to another address closes Info windows only, as `desktop.tsx` does today; any other window (the Lab,
  Contact) stays open and keeps what it holds.
- The phone: a page's component comes with its route, lazily, so it ships in the route's own chunk and not in the root chunk every
  page loads (today the home and project pages are static imports in `phone-layout.tsx`, fine for those two, not for the form).
  The home page gets an empty list of sections below the folders, `app/os/phone/home-sections.ts`, which L2 and C2 fill.
- The existing project pages and their e2e tests pass unchanged, and the build's root chunk holds nothing new.

**Files:** `app/core/pages.ts` and its test, `app/routes/home.tsx` and `project.tsx` (their `meta`), `react-router.config.ts`
(the list), `app/os/os-route.ts`, `app/os/layout.tsx`, `app/os/desktop/desktop.tsx`, `app/os/desktop/apps/page-windows.ts`,
`app/os/phone/phone-layout.tsx`, `app/os/phone/home.tsx`, `app/os/phone/home-sections.ts`, `e2e/desktop.spec.ts`,
`e2e/layout.spec.ts`, `e2e/pages.spec.ts` (its sitemap and meta tests read `pages.ts`, so `/contact` is covered when C2 adds it,
and its home-links test looks inside the folder sections only, so the cards below them don't break it).

**Checks:** unit tests of the page list (every project, unique paths, a title and description each); e2e unchanged and green;
the sitemap byte for byte as before.

### G1 Gero's module: pin, fetch, run (code)

**Delivers**
- `app/lab/gero.ts`: the pin (tag `v0.5.5`, version `0.5.5`, the files' names and SHA-256s) and the URLs the client fetches.
- `scripts/gero-assets.mjs`: downloads both assets from the release into `.cache/gero/` once, checks the hashes, copies them to
  `public/gero/` and removes an older pin's files; fails naming the URL and the hash. `public/gero/` in `.gitignore`.
  `package.json`: a `gero` script, run first by `build`, `check` and `dev`; Vitest's `globalSetup` runs it; `ci.yml` runs it
  before the check job's steps and caches `.cache/gero/` on the pin.
- `app/lab/module.ts`: the typed binding (instantiate with `instantiateStreaming`, falling back to `arrayBuffer` when the type
  isn't `application/wasm`; the arena, the `Result`, files, build, check, VM create, load, step, take output, destroy), with
  gero-lab's MIT notice where it is ported.
- `app/lab/run.ts`: the sliced run (slices by time, the cap, Stop, the output's 64 KB, a trap and the fresh instance after it, the
  state: halted, stopped, faulted, with the steps) and the diagnostics' wording.
- `app/lab/samples.ts`: the manifest's type and its one fetch a page load, shared by the window and the Terminal.
- `app/lab/use-gero.ts`: the hook the window uses.
- `scripts/csp.ts`: `'wasm-unsafe-eval'` in `script-src`, its unit test, and README Build's policy line.
- `vercel.json`: `/gero/*` cached a year, in the `hit` phase like `/assets/*`.
- README Layout (`app/lab/`, `public/gero/`) and Build (the pin, the fetch, how to move to a new release).

**Files:** the above, `vitest.config.ts`, `.github/workflows/ci.yml`. Nothing under `app/os/`.

**Checks:** the unit tests listed under the Lab; `pnpm check` from a clean clone (the fetch included); the CSP test.

### C1 The contact function (security, Opus)

**Delivers**
- `app/core/contact.ts`: the fields, their limits, the validation both sides use, the honeypot's name, the two seconds.
- `app/core/contact-handler.ts`: the handler as described under [the function](#the-contact-form), reading `RESEND_API_KEY`, with
  its test beside it.
- `api/contact.ts`, the only file in `api/`: the wrapper, importing `../app/core/contact-handler.js`.
- `tsconfig.json` and `eslint.config.js` take in `api/`.
- README Hosting: the function, its environment variable and where it is set, what it logs and what it stores (nothing), the
  Firewall rule, and that `scripts/serve.mjs` and `pnpm e2e` don't run it.
- Its own preview (Q10), on the user's go: its branch pushed to origin, and on that preview the function builds beside this
  `vercel.json` (`framework: null`, `routes`) on the project's Node version (which major Vercel picks from `engines`: not verified
  until then), answers `503` with no key and `403` from another origin, and the static pages are unchanged. If the function needs
  a change in `package.json` (a Node pin), C1 reports it rather than editing G1's file. Then its push to `phase-2`, on another go,
  with its last packet over `origin/phase-2..HEAD`. Nothing on the site calls it until C2.

**Files:** `app/core/contact.ts`, `app/core/contact-handler.ts` and their tests, `api/contact.ts`, `tsconfig.json`,
`eslint.config.js`, README Hosting.

**Checks:** the unit tests listed under the form; a reviewer's read for header injection, the `Origin` check, the logs; `pnpm
check`; the preview's answers.

### S1 Sound (code)

**Delivers**
- `app/core/settings.ts`: `sound`, off by default, in `partialize`, so it is saved; its tests.
- `app/os/sound/`: the context's life (made on a gesture, `ambient`, suspended when off), the synth, the cues of Q7, the chunk.
- `SoundSetting` in `app/os/controls/settings-controls.tsx`; the row in `app/os/desktop/apps/control-panel.tsx` (and its window's
  new size in `launch.ts`) and in `app/os/phone/control-panel-sheet.tsx`; Special's `Sound` in
  `app/os/desktop/menubar/use-menus.ts`.
- The gesture listener in `app/root.tsx`; the windows' clicks from a subscriber in `app/os/desktop/windows/window-layer.tsx`; one
  line each in `system-dialogs.tsx` (the beep), `menus.tsx` (Restart and Shut Down), and the phone's shared `dialog.tsx`, which
  opens and closes both the viewer and the sheet.
- `docs/design.md`: a Sound section, and the Control Panel and Phone lines.

**Files:** the above, their stories and tests, `e2e/sound.spec.ts`.

**Checks:** the tests listed under Sound; `look.mjs` against `#d-panel` and `#p-sheet`; `pnpm e2e`.

### L2 The Lab window and the phone's card (code)

**Delivers** what [the Lab](#the-lab) describes, matched to `#d-lab` and `#p-home`:
- `app/os/lab/`: the window, the picker, the editor, the output pane, `lab.css`, a chunk of the desktop's loaded with the window;
- the flask icon, the desktop icon, Jelly HD's item, the registry line, `openLab` in `launch.ts`;
- the phone's Lab section and its Gero Lab card in `home-sections.ts`;
- `e2e/lab.spec.ts`, a Lab run in `e2e/csp.spec.ts`, the window in `e2e/axe.spec.ts`, `e2e/aria.spec.ts` and the keyboard walk,
  the phone's card in the home page's aria tree; `docs/design.md`'s Lab section and Phone line.

**Checks:** as listed under the Lab; `look.mjs` at 1:1 against the two frames, zoomed in; `pnpm e2e`; both Lighthouse runs still
at 100/100/100 and 0.9.

### C2 The contact form, both layouts (code)

**Delivers** what [the contact form](#the-contact-form) describes, matched to `#d-contact`, `#p-contact` and `#p-home`:
- `app/routes/contact.tsx`, its route line, its entry in `pages.ts` and its line in `page-windows.ts`; the page component lazily;
- `app/os/contact/`: the form (one component, two looks), the window, the phone page, the notice from `privacy.ts`, `contact.css`;
- the envelope icon, the desktop icon, Jelly HD's item, the registry line, `openContact`, the phone's Contact section;
- `app/core/studio.ts`'s comment ("the site has no form until Phase 2");
- `e2e/contact.spec.ts` with the stub, `/contact` in `e2e/axe.spec.ts`, `e2e/aria.spec.ts`, the keyboard walk and both Lighthouse
  configs; `docs/design.md`'s Contact section; README Layout.

**Checks:** as listed under the form; `look.mjs` against the frames; `pnpm e2e`; both Lighthouse runs on `/contact` too; a real
send from `phase-2`'s preview once U1 is done.

### O1 Link preview images (code)

**Delivers** what [link preview images](#link-preview-images) describes, matched to `#og-hundo` and `#og-home`:
`scripts/og.ts`, its call in `buildEnd`, the tags in `pageMeta`, `satori` as a dev dependency (an exact version, past pnpm's
minimum release age), the build test, README Build, `docs/design.md`'s Link previews section. `/contact`'s image comes once C2's
entry is in `pages.ts`, with no change here.

**Files:** `scripts/og.ts` and its test, `react-router.config.ts` (one line in `buildEnd`), `app/core/site.ts`, `package.json`,
the lockfile, `e2e/pages.spec.ts`, README Build, design.md's Link previews section.

**Checks:** the first image drawn and weighed before the rest (the 60 KB bound is from Chrome's shots, not satori's); the tests;
three images opened at 1:1 beside the mockup.

### L4 `gero` in the Terminal (code)

**Delivers** `gero`, `gero run <program>` and `gero help` in `app/core/shell.ts`, as effects the Terminal hands to the desktop
(`onOpenLab(program, run)`); the programs' names from `samples.ts`'s fetch, made the first time `gero` is typed, for `gero help`,
the error and completion; `help`'s list; `docs/design.md`'s Shell line.

**Files:** `app/core/shell.ts` and its test, `app/core/complete.ts`, `app/os/shell/shell.tsx` (the prop),
`app/os/desktop/apps/terminal.tsx`, `e2e/desktop.spec.ts` (one test).

### F1 The sweep, the release review (code, Opus)

Each feature came with its own gates; this pass looks across them on `phase-2`'s tip and carries the release.

**Delivers**
- The focus walk and a reduced-motion run over everything Phase 2 added, the sheet's Sound row and Special's included; the
  keyboard walk end to end (open the Lab from the Terminal, run, close; send a message; turn sound on and off).
- `pnpm check`, `pnpm e2e` and both Lighthouse configs over every page kind on the tip.
- The walk on `phase-2`'s preview: the headers, `/contact` sending a real message, the Lab, sound.
- `plan.md`'s decisions (this file's), its Phase 2 marked done; README; `design.md` read through once.
- Fixes for what it finds.
- The release packet over `origin/main..HEAD` at the tip, read by the reviewer and recorded with `--again`; then the report that
  the merge is ready (M), with the tip's sha.
- After the merge: production probed, the link-preview debuggers.

**Files:** whatever the findings touch, `lighthouserc*.json`, `e2e/*`, `docs/plan.md`, README.

### M `phase-2` into `main` (the opener)

On the user's one go: `git fetch origin`, then `git push origin <the sha F1 reported>:refs/heads/main`, a fast-forward
([the merge](#the-release-branch)). CI on `main`, Vercel's
production deploy, F1's probe. Then, on another go, `phase-2` deleted on origin.

## The user's answers

Given on 22 Nov 2026, through the opener, the recommended option first; the user's words as they picked them.

1. **Which provider sends the form's e-mail?** "Vercel fn + Resend (Recommended)". A Vercel Function in this project and Resend.
   (Not taken: the function through Gandi's SMTP; Cloudflare Email Service; a form relay.)
2. **Where does the mail go?** "To max@jellycat.fr (Recommended)": to max@jellycat.fr, from contact@jellycat.fr, with the visitor
   as `Reply-To`. (Not taken: another inbox.)
3. **Spam protection?** "Light, Turnstile later (Recommended)": the honeypot, the two seconds, the server's checks and a Vercel
   rate-limit rule; Turnstile only if spam gets through. (Not taken: Turnstile now; the honeypot and server checks only.)
4. **Which Gero programs does the Lab run?** "All 12, open on fizzbuzz (Recommended)". (Not taken: the seven in Gero only;
   `fizzbuzz` alone.)
5. **Can the visitor edit the program?** "Desktop yes, phone no (Recommended)". With Q6, there is no Lab on the phone, so this
   means the desktop's editor. (Not taken: read-only everywhere; editable on the phone too.)
6. **Does the Lab get a phone version, and do the Lab and the form get addresses?** "Lab desktop-only": the Lab is a desktop window
   with no address; the phone gets a card linking to gero-lab.vercel.app, and there is no `/lab` page. (Not taken: the Lab as a
   page on both layouts, which was the recommendation; windows only, with no addresses.) The contact form, asked on its own: "A
   /contact page (Recommended)": a prerendered `/contact` page on the phone, linked from the home page, which opens the Contact
   window on the desktop, in the sitemap, with a preview image.
7. **What makes sound?** "A few system sounds (Recommended)". (Not taken: those plus key ticks, menu clicks and a tone when a
   program halts; the alert's beep only.)
8. **The words the plan proposes, and a privacy notice?** "Lines + notice (Recommended)": the proposed lines, and a short notice
   under the form, worded by an Opus pass (N1); the user approves the final text before the form ships. (Not taken: the lines
   only; the notice on a page of its own; rewriting the lines.)
9. **Do the features go live one at a time?** "All at once". Everything ships together from a release branch after F1
   ([the release branch](#the-release-branch)). (Not taken: each feature on `main` as it is done, which was the recommendation.)
10. **A preview push in C1, before anything calls the function?** "Yes, push for a preview (Recommended)". C1's branch is pushed
    for a Vercel preview, still on the user's go at the time. (Not taken: waiting for F1's preview.)
11. **Which Vercel plan is the team on?** The user's words: "I already am on Pro". Nothing changes; the Hobby caveat is gone.

**Two findings.** `scripts/look.mjs` launched Chrome with Playwright's default `--hide-scrollbars`, so no look had shown a scroll
bar, the Readme window's 1-bit one included; this plan's shots were taken without that flag (`ignoreDefaultArgs`). X1 fixes it in
wave 1.

And outside this repository: gero-lab's production pins gero v0.3.0 while gero's latest release is v0.5.5. Its README says the pin
is a decision somebody makes, so this is not a bug; the site's Lab runs a newer gero than gero-lab. Moving gero-lab's `GERO_TAG`
is gero-lab's own task, if the user wants it.

**Where this differs from plan.md's line.** "Fetched the way gero-lab fetches it": the same mechanism, plus a pinned hash, and a
newer release than gero-lab's production. No worker, where gero-lab has one. The Lab is the desktop's only. The `~/lab`
directory phase-1.md promised is dropped (the `gero` command stays). "A contact form that relays to an inbox": as written, with
nothing stored on the site and a privacy notice.
